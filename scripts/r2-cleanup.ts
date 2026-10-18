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
  const [images, logos, content] = await Promise.all([
    supabase.from("car_images").select("object_key"),
    supabase.from("brand_logos").select("object_key"),
    supabase.from("site_content").select("value"),
  ]);
  for (const result of [images, logos, content]) if (result.error) throw result.error;
  const used = new Set<string>([
    ...images.data!.map((r) => r.object_key as string),
    ...logos.data!.map((r) => r.object_key as string),
    ...content
      .data!.map((r) => r.value as string)
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
