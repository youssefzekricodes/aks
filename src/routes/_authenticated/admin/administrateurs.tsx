import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminsTab } from "@/features/admin/AdminsTab";
import { sessionQuery, adminsQuery } from "@/features/admin/model";

export const Route = createFileRoute("/_authenticated/admin/administrateurs")({
  // Super admins only (the Edge Function checks again).
  beforeLoad: ({ context }) => {
    if (context.session.role !== "super_admin") throw redirect({ to: "/admin", replace: true });
  },
  // Starts loading the data as soon as the link is hovered (not blocking).
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(adminsQuery);
  },
  head: () => ({ meta: [{ title: "Administrateurs — Administration" }] }),
  component: AdministratorsPage,
});

function AdministratorsPage() {
  const context = Route.useRouteContext();
  // Kept fresh after 2FA changes made on this page.
  const session = useQuery({ ...sessionQuery, initialData: context.session });
  return session.data ? <AdminsTab session={session.data} /> : null;
}
