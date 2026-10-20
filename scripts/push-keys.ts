// Creates the key pair of the admin push notifications (Web Push / VAPID) and
// writes it into .env (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY). The private key is
// never printed: copy both values from .env into Netlify (Site configuration →
// Environment variables) yourself. Existing keys are kept unless --force.
//   npm run push:keys
import { generateKeyPairSync } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const file = ".env";
const env = existsSync(file) ? readFileSync(file, "utf8") : "";
const has = (name: string) => new RegExp(`^${name}=.+`, "m").test(env);
if (has("VAPID_PUBLIC_KEY") && has("VAPID_PRIVATE_KEY") && !process.argv.includes("--force")) {
  console.log("Les clés existent déjà dans .env (ajoutez --force pour en créer de nouvelles).");
  process.exit(0);
}

// P-256 key pair: public key as the raw point, private key as the scalar (base64url).
const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const pub = publicKey.export({ format: "jwk" });
const priv = privateKey.export({ format: "jwk" });
const raw = Buffer.concat([
  Buffer.from([4]),
  Buffer.from(pub.x!, "base64url"),
  Buffer.from(pub.y!, "base64url"),
]);
const values: Record<string, string> = {
  VAPID_PUBLIC_KEY: raw.toString("base64url"),
  VAPID_PRIVATE_KEY: priv.d!,
};

let next = env;
for (const [name, value] of Object.entries(values)) {
  const line = `${name}=${value}`;
  next = new RegExp(`^${name}=.*$`, "m").test(next)
    ? next.replace(new RegExp(`^${name}=.*$`, "m"), line)
    : `${next.replace(/\n*$/, "\n")}${line}\n`;
}
writeFileSync(file, next);
console.log(
  "Clés de notification écrites dans .env (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY).\n" +
    "Copiez ces deux valeurs dans Netlify → Environment variables, puis redéployez.",
);
