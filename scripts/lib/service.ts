// Shared by the maintenance scripts. These are the ONLY places that use the
// Supabase service-role key and R2 credentials outside request handling; they
// run from a trusted terminal, never in the browser or the web server.
import { createClient } from "@supabase/supabase-js";
import { AwsClient } from "aws4fetch";

export function need(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name} (see .env.example).`);
  return value;
}

export function serviceClient() {
  return createClient(need("SUPABASE_URL"), need("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function r2() {
  const client = new AwsClient({
    accessKeyId: need("R2_ACCESS_KEY_ID"),
    secretAccessKey: need("R2_SECRET_ACCESS_KEY"),
    service: "s3",
    region: "auto",
  });
  const bucketUrl = `https://${need("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com/${need("R2_BUCKET")}`;
  return { client, bucketUrl, publicUrl: need("R2_PUBLIC_URL").replace(/\/+$/, "") };
}

/** All object keys in the bucket (ListObjectsV2, paginated). */
export async function listKeys(prefix = "") {
  const { client, bucketUrl } = r2();
  const keys: { key: string; lastModified: Date }[] = [];
  let token: string | undefined;
  do {
    const url = new URL(bucketUrl);
    url.searchParams.set("list-type", "2");
    if (prefix) url.searchParams.set("prefix", prefix);
    if (token) url.searchParams.set("continuation-token", token);
    const response = await client.fetch(url);
    if (!response.ok)
      throw new Error(`R2 list failed: ${response.status} ${await response.text()}`);
    const xml = await response.text();
    for (const [, key, modified] of xml.matchAll(
      /<Contents>.*?<Key>(.*?)<\/Key>.*?<LastModified>(.*?)<\/LastModified>.*?<\/Contents>/gs,
    ))
      keys.push({ key: decodeXml(key!), lastModified: new Date(modified!) });
    token = xml.match(/<NextContinuationToken>(.*?)<\/NextContinuationToken>/)?.[1];
  } while (token);
  return keys;
}

const decodeXml = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
