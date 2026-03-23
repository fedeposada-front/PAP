import {
  PublicInfoScreenNext,
  type PublicInfoSection,
} from "../../src/app/components/screens/PublicInfoScreenNext";

const sections: PublicInfoSection[] = [
  {
    title: "Données utilisées",
    paragraphs: [
      "L'application peut utiliser des données de compte, de panier, de localisation et d'interaction avec les boutiques pour faire fonctionner le service.",
      "Cette page devra décrire précisément les traitements, les bases légales, les durées de conservation et les droits des utilisateurs avant la mise en production.",
    ],
  },
  {
    title: "Version provisoire",
    paragraphs: [
      "Le contenu actuel sert de repère pendant la phase de développement.",
      "Une politique de confidentialité complète devra être rédigée et validée avant l'ouverture publique du site.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <PublicInfoScreenNext
      title="Confidentialité"
      intro="La politique de confidentialité définitive n'est pas encore publiée. Cette page indique seulement le cadre prévu."
      sections={sections}
    />
  );
}
