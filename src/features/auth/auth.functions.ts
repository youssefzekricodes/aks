import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const signIn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z
        .string()
        .trim()
        .email()
        .max(254)
        .transform((v) => v.toLowerCase()),
      password: z.string().min(1).max(256),
    }),
  )
  .handler(async ({ data }) =>
    (await import("@/server/auth/session")).login(data.email, data.password),
  );
export const signOut = createServerFn({ method: "POST" }).handler(async () =>
  (await import("@/server/auth/session")).logout(),
);
export const getSession = createServerFn({ method: "GET" }).handler(async () =>
  (await import("@/server/auth/session")).currentAdmin(),
);
