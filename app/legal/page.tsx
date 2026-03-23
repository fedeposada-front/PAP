import {
  PublicInfoScreenNext,
  type PublicInfoSection,
} from "../../src/app/components/screens/PublicInfoScreenNext";

const sections: PublicInfoSection[] = [
  {
    title: "Publication",
    paragraphs: [
      "Cette page est une version provisoire tant que les informations légales définitives de publication ne sont pas encore finalisées.",
      "Avant mise en production, elle devra inclure l'identité de l'éditeur, les coordonnées de contact et les informations d'hébergement requises.",
    ],
  },
  {
    title: "Statut actuel",
    paragraphs: [
      "Le produit est actuellement en phase de développement et de test.",
      "Les mentions légales complètes devront être validées avant toute ouverture publique du service.",
    ],
  },
];

export default function LegalPage() {
  return (
    <PublicInfoScreenNext
      title="Mentions légales"
      intro="Les mentions légales affichées ici sont provisoires et doivent être complétées avant publication officielle."
      sections={sections}
    />
  );
}
