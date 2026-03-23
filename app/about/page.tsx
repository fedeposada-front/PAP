import {
  PublicInfoScreenNext,
  type PublicInfoSection,
} from "../../src/app/components/screens/PublicInfoScreenNext";

const sections: PublicInfoSection[] = [
  {
    title: "Notre idée",
    paragraphs: [
      "MonCadeauLocal aide les acheteurs à trouver des cadeaux auprès des commerces de proximité.",
      "La plateforme met en avant les boutiques locales, leurs produits, leurs actualités et leurs options de retrait ou de livraison.",
    ],
  },
  {
    title: "Pour qui",
    paragraphs: [
      "Le service s'adresse aux visiteurs qui veulent découvrir des idées cadeaux près de chez eux et aux commerçants qui souhaitent valoriser leur offre en ligne.",
      "L'objectif est de simplifier la découverte locale tout en gardant une relation directe entre le client et la boutique.",
    ],
  },
];

export default function AboutPage() {
  return (
    <PublicInfoScreenNext
      title="À propos"
      intro="MonCadeauLocal est une marketplace locale pensée pour rendre les commerces de proximité plus visibles sur mobile."
      sections={sections}
    />
  );
}
