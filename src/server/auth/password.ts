import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCallback(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    ),
  );
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, salt, hex] = encoded.split(":");
  if (algorithm !== "scrypt" || !salt || !hex) return false;
  const actual = await derive(password, salt);
  const expected = Buffer.from(hex, "hex");
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}
