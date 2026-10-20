import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/features/admin/ProfilePage";
import { profileQuery } from "@/features/admin/model";

/** "Mon profil": name, e-mail and photo of the signed-in admin. */
export const Route = createFileRoute("/_authenticated/admin/profil")({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(profileQuery);
  },
  head: () => ({ meta: [{ title: "Mon profil — Administration" }] }),
  component: ProfilePageRoute,
});

function ProfilePageRoute() {
  const { session } = Route.useRouteContext();
  return <ProfilePage session={session} />;
}
