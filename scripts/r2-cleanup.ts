// Deletes R2 objects that nothing in the database references any more
// (abandoned uploads, failed deletions). Dry run by default:
//   npm run r2:cleanup            → list orphans
//   npm run r2:cleanup -- --apply → delete orphans older than 24 hours
import { r2, listKeys, serviceClient } from "./lib/service.ts";

const apply = process.argv.includes("--apply");
const GRACE_MS = 24 * 60 * 60 * 1000; // never touch uploads that may still be in a form

try {
  const supabase = serviceClient();
  const { client, bucketUrl, publicUrl } = r2();
  // Every row: PostgREST returns at most 1,000 per request, and a missed row
  // would make a photo in use look orphaned.
  const all = async (table: string, column: string) => {
    const rows: Record<string, unknown>[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from(table)
        .select(column)
        .order(column)
        .range(from, from + 999);
      if (error) throw error;
      rows.push(...(data as unknown as Record<string, unknown>[]));
      if (data.length < 1000) return rows;
    }
  };
  const [images, logos, content] = await Promise.all([
    all("car_images", "object_key"),
    all("brand_logos", "object_key"),
    all("site_content", "value"),
  ]);
  const used = new Set<string>([
    ...images.map((r) => r["object_key"] as string),
    ...logos.map((r) => r["object_key"] as string),
    ...content
      .map((r) => r["value"] as string)
      .filter((v) => v.startsWith(`${publicUrl}/`))
      .map((v) => v.slice(publicUrl.length + 1)),
  ]);

  const objects = await listKeys();
  const orphans = objects.filter(
    (o) => !used.has(o.key) && Date.now() - o.lastModified.getTime() > GRACE_MS,
  );
  console.log(
    `${objects.length} objects, ${used.size} referenced, ${orphans.length} orphaned (>24 h).`,
  );
  for (const orphan of orphans) {
    console.log(`${apply ? "delete" : "would delete"} ${orphan.key}`);
    if (apply) {
      const response = await client.fetch(`${bucketUrl}/${orphan.key}`, { method: "DELETE" });
      if (!response.ok && response.status !== 404) console.error(`  failed: ${response.status}`);
    }
  }
  if (!apply && orphans.length) console.log("Dry run. Re-run with --apply to delete.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
