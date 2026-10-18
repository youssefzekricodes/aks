import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalContact, LegalPage, LegalSection } from "@/components/aks/LegalPage";
import { resolveContent } from "@/features/content/definition";
import { publicConfigQuery, siteContentQuery } from "@/lib/queries";
import { seo } from "@/lib/seo";

/** User data deletion instructions (the "Data Deletion Instructions URL" of the Meta app). */
export const Route = createFileRoute("/suppression-des-donnees")({
  loader: async ({ context }) => {
    const [content, config] = await Promise.all([
      context.queryClient.ensureQueryData(siteContentQuery),
      context.queryClient.ensureQueryData(publicConfigQuery),
    ]);
    return { content, origin: config.origin };
  },
  head: ({ loaderData }) => {
    const site = resolveContent(loaderData?.content ?? {}, "seo.site_name");
    return seo({
      title: `Suppression de vos données — ${site}`,
      description: `Comment demander la suppression de vos données personnelles chez ${site}.`,
      siteName: site,
      origin: loaderData?.origin,
      path: "/suppression-des-donnees",
    });
  },
  component: DeletionPage,
});

function DeletionPage() {
  return (
    <LegalPage
      eyebrow="Informations légales"
      title="Suppression de vos données"
      intro={
        <p>
          Vous pouvez demander à tout moment la suppression des données personnelles qu’Auto Kontor
          Sfax détient sur vous. Voici comment faire.
        </p>
      }
    >
      <LegalSection title="Faire une demande">
        <p>Contactez-nous par l’un des moyens suivants, en indiquant :</p>
        <ul>
          <li>votre nom ;</li>
          <li>le numéro de téléphone et/ou l’e-mail utilisés pour nous contacter ;</li>
          <li>l’objet : « Suppression de mes données ».</li>
        </ul>
        <LegalContact />
      </LegalSection>

      <LegalSection title="Ce que nous supprimons">
        <p>
          Les demandes envoyées depuis le formulaire de contact (nom, téléphone, e-mail, message) et
          toute autre donnée vous concernant. Les statistiques de consultation étant anonymes, elles
          ne permettent pas de vous identifier et ne sont pas concernées.
        </p>
      </LegalSection>

      <LegalSection title="Délai et confirmation">
        <p>
          Nous vérifions votre identité si nécessaire, puis supprimons vos données dans un délai de
          30 jours. Nous vous confirmons la suppression par le moyen de contact de votre choix.
        </p>
      </LegalSection>

      <LegalSection title="Facebook et Instagram">
        <p>
          Notre application Meta sert uniquement à publier nos annonces sur nos propres pages
          Facebook et Instagram : elle ne collecte aucune donnée personnelle de votre compte. Il n’y
          a donc rien à supprimer de notre côté pour votre compte Facebook ou Instagram.
        </p>
        <p>
          Si vous avez autorisé une application dans votre compte Facebook, vous pouvez la retirer à
          tout moment : Facebook → Paramètres et confidentialité → Paramètres → Applications et
          sites web → sélectionnez l’application → Supprimer.
        </p>
        <p>
          Pour les messages ou commentaires laissés sur nos pages Facebook et Instagram, vous pouvez
          les supprimer vous-même, ou nous demander de le faire.
        </p>
      </LegalSection>

      <LegalSection title="Plus d’informations">
        <p>
          Voir notre <Link to="/confidentialite">politique de confidentialité</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
