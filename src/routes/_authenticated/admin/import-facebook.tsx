import { createFileRoute } from "@tanstack/react-router";
import { FacebookImportPage } from "@/features/admin/FacebookImportPage";
import { adminCarsQuery } from "@/features/admin/model";

export const Route = createFileRoute("/_authenticated/admin/import-facebook")({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(adminCarsQuery);
  },
  head: () => ({ meta: [{ title: "Import Facebook — Administration" }] }),
  component: FacebookImportPage,
});
