import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { openDatabase } from "../src/server/db/database.ts";
import { hashPassword } from "../src/server/auth/password.ts";

async function secret(prompt: string): Promise<string> {
  if (!stdin.isTTY) throw new Error("Run this command in an interactive terminal.");
  stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.resume();
  return new Promise((resolve, reject) => {
    let value = "";
    const done = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off("data", input);
      stdout.write("\n");
    };
    const input = (chunk: Buffer) => {
      for (const char of chunk.toString()) {
        if (char === "\u0003") {
          done();
          reject(new Error("Cancelled"));
          return;
        }
        if (char === "\r" || char === "\n") {
          done();
          resolve(value);
          return;
        }
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else if (char >= " ") value += char;
      }
    };
    stdin.on("data", input);
  });
}
try {
  const terminal = createInterface({ input: stdin, output: stdout });
  const email = (await terminal.question("Admin e-mail: ")).trim().toLowerCase();
  terminal.close();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    throw new Error("Invalid e-mail.");
  const password = await secret("Password (12–256 characters, hidden): ");
  if (password.length < 12 || password.length > 256)
    throw new Error("Password must contain 12–256 characters.");
  if (password !== (await secret("Confirm password: "))) throw new Error("Passwords do not match.");
  const db = openDatabase();
  const existing = db.prepare("SELECT id FROM admins WHERE email = ?").get(email);
  const hash = await hashPassword(password);
  db.exec("BEGIN IMMEDIATE");
  if (existing) {
    db.prepare("UPDATE admins SET password_hash = ? WHERE id = ?").run(
      hash,
      String(existing["id"]),
    );
    db.prepare("DELETE FROM sessions WHERE admin_id = ?").run(String(existing["id"]));
  } else db.prepare("INSERT INTO admins VALUES (?, ?, ?)").run(randomUUID(), email, hash);
  db.exec("COMMIT");
  db.prepare("DELETE FROM rate_limits WHERE key = ?").run(`login:${email}`);
  db.close();
  console.log("Admin saved. Existing sessions for this account were revoked.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Admin setup failed.");
  process.exitCode = 1;
}
