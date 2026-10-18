// Creates or updates an administrator (admin or super_admin) in Supabase Auth (role in app_metadata,
// which only the service-role key can write). Prompts for the password so it
// never appears in shell history.  npm run admin:create
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { serviceClient } from "./lib/service.ts";

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
  const superAnswer = (
    await terminal.question("Super administrateur (gère les admins, 2FA obligatoire) ? [o/N] ")
  )
    .trim()
    .toLowerCase();
  terminal.close();
  const role =
    superAnswer === "o" || superAnswer === "oui" || superAnswer === "y" ? "super_admin" : "admin";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    throw new Error("Invalid e-mail.");
  const password = await secret("Password (12–256 characters, hidden): ");
  if (password.length < 12 || password.length > 256)
    throw new Error("Password must contain 12–256 characters.");
  if (password !== (await secret("Confirm password: "))) throw new Error("Passwords do not match.");

  const supabase = serviceClient();
  let existing: { id: string } | undefined;
  for (let page = 1; !existing; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    existing = data.users.find((user) => user.email?.toLowerCase() === email);
    if (data.users.length < 200) break;
  }
  const attributes = { password, email_confirm: true, app_metadata: { role } };
  const { error } = existing
    ? await supabase.auth.admin.updateUserById(existing.id, attributes)
    : await supabase.auth.admin.createUser({ email, ...attributes });
  if (error) throw error;
  console.log(`${existing ? "Updated" : "Created"} ${email} as ${role}.`);
  if (role === "super_admin")
    console.log("At first sign-in you will be asked to set up two-factor authentication.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Admin setup failed.");
  process.exitCode = 1;
}
