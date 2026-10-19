// Configures and checks the R2 bucket: CORS for browser uploads from the site,
// then an upload → public read → delete round trip.   npm run r2:setup
import { createHash, randomUUID } from "node:crypto";
import { need, r2 } from "./lib/service.ts";

const { client, bucketUrl, publicUrl } = r2();
// Browsers send the origin without a trailing slash; R2 compares it exactly.
const asOrigin = (value: string) => {
  try {
    return new URL(value.trim()).origin;
  } catch {
    return value.trim().replace(/\/+$/, "");
  }
};
const origins = [need("APP_ORIGIN"), ...(process.env["R2_EXTRA_ORIGINS"] ?? "").split(",")]
  .filter((o) => o.trim())
  .map(asOrigin)
  .filter((o, i, all) => all.indexOf(o) === i);

const cors = `<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration>
  <CORSRule>
${origins.map((o) => `    <AllowedOrigin>${o}</AllowedOrigin>`).join("\n")}
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedHeader>content-type</AllowedHeader>
    <MaxAgeSeconds>3600</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>`;

try {
  const corsResponse = await client.fetch(`${bucketUrl}?cors`, {
    method: "PUT",
    body: cors,
    headers: {
      "content-type": "application/xml",
      "content-md5": createHash("md5").update(cors).digest("base64"),
    },
  });
  if (corsResponse.ok) console.log(`CORS set for: ${origins.join(", ")}`);
  else if (corsResponse.status === 403) {
    // Object-only tokens (the recommended least privilege) cannot change bucket
    // settings: print the policy to paste in the dashboard and keep checking files.
    const policy = [
      {
        AllowedOrigins: origins,
        AllowedMethods: ["PUT", "GET"],
        AllowedHeaders: ["content-type"],
        MaxAgeSeconds: 3600,
      },
    ];
    console.log(
      `The API token cannot edit bucket settings (expected for an "Object Read & Write" token).\n` +
        `Set CORS once in Cloudflare: R2 → ${need("R2_BUCKET")} → Settings → CORS Policy → Edit, paste:\n\n` +
        `${JSON.stringify(policy, null, 2)}\n`,
    );
  } else throw new Error(`CORS update failed: ${corsResponse.status} ${await corsResponse.text()}`);

  const key = `site/healthcheck/${randomUUID()}.png`;
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  const put = await client.fetch(`${bucketUrl}/${key}`, {
    method: "PUT",
    body: png,
    headers: { "content-type": "image/png" },
  });
  if (!put.ok) throw new Error(`Test upload failed: ${put.status}`);
  const read = await fetch(`${publicUrl}/${key}`);
  console.log(
    read.ok
      ? `Public URL OK (${publicUrl}).`
      : `WARNING: ${publicUrl}/${key} returned ${read.status}. Enable public access (custom domain or r2.dev) and check R2_PUBLIC_URL.`,
  );
  await client.fetch(`${bucketUrl}/${key}`, { method: "DELETE" });
  console.log("R2 bucket ready.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
