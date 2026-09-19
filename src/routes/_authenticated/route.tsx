import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSession } from "@/features/auth/auth.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (!(await getSession())) throw redirect({ to: "/auth" });
  },
  component: () => <Outlet />,
});
