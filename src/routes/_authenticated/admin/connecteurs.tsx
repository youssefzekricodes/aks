import { socialStatusQuery } from "@/features/admin/SocialCard";
import { createFileRoute } from "@tanstack/react-router";
import { ConnectorsTab } from "@/features/admin/ConnectorsTab";

export const Route = createFileRoute("/_authenticated/admin/connecteurs")({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(socialStatusQuery);
  },
  head: () => ({ meta: [{ title: "Connecteurs — Administration" }] }),
  component: ConnectorsTab,
});
