import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { sessionQuery } from "@/features/admin/model";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  // The session is cached (see sessionQuery): moving between admin pages does not
  // ask the server again. Every server function still checks it on its own.
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(sessionQuery);
    // Super admins must finish two-factor authentication on /auth first.
    if (!session || session.mfa !== "ok") throw redirect({ to: "/auth" });
    return { session };
  },
  component: () => <Outlet />,
});
