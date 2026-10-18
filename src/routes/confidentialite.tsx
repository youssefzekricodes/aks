import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalContact, LegalPage, LegalSection } from "@/components/aks/LegalPage";
import { resolveContent } from "@/features/content/definition";
import { publicConfigQuery, siteContentQuery } from "@/lib/queries";
import { seo } from "@/lib/seo";

/** Privacy policy (also the "Privacy Policy URL" of the Meta app). */
export const Route = createFileRoute("/confidentialite")({
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
      title: `Politique de confidentialité — ${site}`,
      description: `Données personnelles traitées par ${site}, finalités, durées de conservation et vos droits.`,
      siteName: site,
      origin: loaderData?.origin,
      path: "/confidentialite",
    });
  },
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Informations légales"
      title="Politique de confidentialité"
      intro={
        <p>
          Auto Kontor Sfax respecte votre vie privée. Cette page explique quelles données
          personnelles sont traitées lorsque vous utilisez ce site et nos pages Facebook et
          Instagram, pourquoi, combien de temps, et comment exercer vos droits, conformément à la
          loi organique n° 2004-63 du 27 juillet 2004 portant sur la protection des données à
          caractère personnel.
        </p>
      }
    >
      <LegalSection title="Responsable du traitement">
        <LegalContact />
      </LegalSection>

      <LegalSection title="Données que nous collectons">
        <ul>
          <li>
            <strong>Formulaire de contact</strong> : nom, téléphone, e-mail (facultatif), message
            et, le cas échéant, le véhicule concerné. Ces informations ne sont collectées que si
            vous nous les envoyez.
          </li>
          <li>
            <strong>Statistiques de consultation</strong> : nous comptons le nombre de vues de
            chaque fiche véhicule (une par session de navigation). Ce comptage est anonyme : il
            n’enregistre ni votre identité, ni votre adresse IP.
          </li>
          <li>
            <strong>Données techniques</strong> : notre hébergeur peut enregistrer temporairement
            des journaux techniques (adresse IP, navigateur) pour la sécurité et le bon
            fonctionnement du site.
          </li>
        </ul>
        <p>
          Nous ne vendons aucune donnée et n’utilisons pas de cookies publicitaires ni de suivi
          marketing sur ce site.
        </p>
      </LegalSection>

      <LegalSection title="Pourquoi nous utilisons ces données">
        <ul>
          <li>Répondre à vos demandes (essai, offre, reprise, prix, recherche d’un véhicule).</li>
          <li>Améliorer notre offre en sachant quels véhicules intéressent le plus.</li>
          <li>Protéger le site contre le spam et les abus.</li>
        </ul>
        <p>
          Base légale : votre consentement lorsque vous nous écrivez, et notre intérêt légitime à
          faire fonctionner et sécuriser le site.
        </p>
      </LegalSection>

      <LegalSection title="Facebook et Instagram">
        <p>
          Nous utilisons une application Meta uniquement pour publier les annonces de nos véhicules
          sur la Page Facebook et le compte Instagram d’Auto Kontor Sfax. Cette application ne
          collecte aucune donnée des visiteurs du site ni des personnes qui consultent nos
          publications. Les seules données Meta conservées sont l’accès à notre propre Page (jeton
          de publication), stocké de façon sécurisée et utilisé uniquement pour publier.
        </p>
        <p>
          Lorsque vous interagissez avec nos pages Facebook ou Instagram, ce sont les règles de
          confidentialité de Meta qui s’appliquent.
        </p>
      </LegalSection>

      <LegalSection title="Destinataires et prestataires">
        <p>
          Vos données sont accessibles uniquement à l’équipe d’Auto Kontor Sfax. Elles sont
          hébergées par nos prestataires techniques, qui agissent pour notre compte :
        </p>
        <ul>
          <li>Supabase (base de données et authentification) ;</li>
          <li>Netlify (hébergement du site) ;</li>
          <li>Cloudflare (stockage des photos et protection anti-spam Turnstile) ;</li>
          <li>Google (carte Google Maps intégrée à la page d’accueil) ;</li>
          <li>Meta (publication de nos annonces sur Facebook et Instagram).</li>
        </ul>
        <p>
          Certains de ces prestataires peuvent traiter des données hors de Tunisie, avec des
          garanties de sécurité appropriées.
        </p>
      </LegalSection>

      <LegalSection title="Durée de conservation">
        <ul>
          <li>Demandes de contact : 3 ans après notre dernier échange, puis suppression.</li>
          <li>Statistiques de consultation : conservées sous forme agrégée et anonyme.</li>
          <li>Journaux techniques : selon la durée de conservation de l’hébergeur.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Vos droits">
        <p>
          Vous pouvez à tout moment demander l’accès à vos données, leur rectification ou leur
          suppression, et vous opposer à leur traitement. Pour cela, écrivez-nous ou appelez-nous
          (coordonnées ci-dessus) ; nous répondons dans un délai de 30 jours. La marche à suivre est
          détaillée sur la page{" "}
          <Link to="/suppression-des-donnees">Suppression de vos données</Link>.
        </p>
        <p>
          Vous pouvez également saisir l’Instance nationale de protection des données personnelles
          (INPDP).
        </p>
      </LegalSection>

      <LegalSection title="Sécurité">
        <p>
          Le site est servi en HTTPS, l’accès à l’administration est protégé par mot de passe et
          double authentification, et les données sont stockées chez des prestataires reconnus.
        </p>
      </LegalSection>

      <LegalSection title="Modifications">
        <p>
          Cette politique peut évoluer ; la date de dernière mise à jour figure en haut de la page.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
