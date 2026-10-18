import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSession } from "@/features/auth/auth.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const session = await getSession();
    // Super admins must finish two-factor authentication on /auth first.
    if (!session || session.mfa !== "ok") throw redirect({ to: "/auth" });
    return { session };
  },
  component: () => <Outlet />,
});
