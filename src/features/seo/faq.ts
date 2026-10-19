import { primaryPhone, resolveContent, resolvePhones } from "@/features/content/definition";

/**
 * Home page FAQ: shown on the page and sent to Google as FAQPage data. Answers use
 * the address, hours and phone from Contenu du site so they never go out of date.
 */
export function homeFaq(content: Record<string, string>) {
  const get = (key: string) => resolveContent(content, key);
  const address = get("showroom.text_3");
  const phone = primaryPhone(resolvePhones(content))?.number;
  let hours = "";
  try {
    hours = (JSON.parse(get("showroom.items")) as { day: string; time: string }[])
      .map(({ day, time }) => `${day} : ${time}`)
      .join(", ");
  } catch {
    hours = "";
  }
  return [
    {
      question: "Où acheter une voiture d’occasion à Sfax ?",
      answer: `Chez AKS – Auto Kontor Sfax, showroom automobile situé ${address}${hours ? ` (${hours})` : ""}. Toutes nos voitures d’occasion sont sélectionnées et contrôlées avant la vente, avec photos, prix et kilométrage en ligne.`,
    },
    {
      question: "Les voitures d’occasion AKS sont-elles contrôlées et garanties ?",
      answer:
        "Oui. Chaque véhicule est inspecté avant d’entrer dans notre showroom, son historique est vérifié, et une garantie mécanique écrite allant jusqu’à 24 mois est proposée sur les véhicules éligibles.",
    },
    {
      question: "Puis-je faire reprendre ma voiture actuelle ?",
      answer:
        "Oui. Nous estimons gratuitement votre véhicule et déduisons sa reprise du prix de votre prochaine voiture, ou nous le rachetons directement.",
    },
    {
      question: "Proposez-vous un financement ?",
      answer:
        "Oui. Notre équipe monte votre dossier de financement avec nos partenaires bancaires et vous présente une offre adaptée à votre budget.",
    },
    {
      question: "Pouvez-vous importer une voiture qui n’est pas en stock ?",
      answer:
        "Oui. Nous recherchons et importons le modèle exact que vous voulez — marque, version, couleur et options — et nous nous occupons des démarches.",
    },
    {
      question: "Quelles marques de voitures trouve-t-on chez AKS ?",
      answer:
        "Toutes les grandes marques : Volkswagen, Peugeot, Renault, Kia, Hyundai, Toyota, Mercedes-Benz, BMW, Audi, Seat, Skoda, Fiat, Suzuki, Chery, MG et bien d’autres, en occasion comme en neuf.",
    },
    {
      question: "Comment contacter Auto Kontor Sfax ?",
      answer: `${phone ? `Par téléphone ou WhatsApp au ${phone}, ` : ""}via le formulaire de la page Contact, ou directement au showroom, ${address}.`,
    },
  ];
}
