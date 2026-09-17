import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { isSignedIn } from "@/lib/fake-auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: () => {
    if (!isSignedIn()) throw redirect({ to: "/auth" });
  },
  component: () => <Outlet />,
});
