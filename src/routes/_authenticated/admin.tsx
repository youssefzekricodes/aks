import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "@/features/admin/AdminPage";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — Auto Kontor Sfax" },
      { name: "description", content: "Espace d'administration du site Auto Kontor Sfax." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});
