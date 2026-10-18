import { adminContentQuery } from "@/features/admin/model";
import { createFileRoute } from "@tanstack/react-router";
import { ContentEditor } from "@/features/content/ContentEditor";

export const Route = createFileRoute("/_authenticated/admin/contenu")({
  // Starts loading the data as soon as the link is hovered (not blocking).
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(adminContentQuery);
  },
  head: () => ({ meta: [{ title: "Contenu du site — Administration" }] }),
  component: ContentEditor,
});
