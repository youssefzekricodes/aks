import { createFileRoute, useRouter } from "@tanstack/react-router";
import { SearchPanel } from "@/components/aks/GlobalSearch";
import { publicCarsQuery } from "@/lib/queries";

/** Full-page search for phones (the header search icon); not indexed. */
export const Route = createFileRoute("/rechercher")({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(publicCarsQuery);
  },
  head: () => ({
    meta: [{ title: "Rechercher une voiture — AKS" }, { name: "robots", content: "noindex" }],
  }),
  component: SearchScreen,
});

function SearchScreen() {
  const router = useRouter();
  return (
    <SearchPanel
      variant="page"
      // Back to where the visitor came from (home if opened directly).
      onClose={() =>
        window.history.length > 1 ? router.history.back() : void router.navigate({ to: "/" })
      }
    />
  );
}
