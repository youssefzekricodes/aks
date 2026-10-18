import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/features/admin/AdminPage";

/** Admin shell (sidebar, top bar); each section below is its own route. */
export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administration — Auto Kontor Sfax" },
      { name: "description", content: "Espace d'administration du site Auto Kontor Sfax." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});
