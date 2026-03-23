import {
  PublicInfoScreenNext,
  type PublicInfoSection,
} from "../../src/app/components/screens/PublicInfoScreenNext";

const sections: PublicInfoSection[] = [
  {
    title: "Côté acheteur",
    paragraphs: [
      "Le visiteur choisit sa ville, explore les boutiques autour de lui, filtre par catégorie et consulte les fiches produit.",
      "Il peut ensuite ajouter des produits au panier, choisir un retrait ou une livraison, puis finaliser sa commande après connexion.",
    ],
  },
  {
    title: "Côté commerçant",
    paragraphs: [
      "Le vendeur crée son compte, vérifie son SIRET, configure sa boutique puis publie ses produits et ses actualités.",
      "La plateforme lui permet ensuite de suivre son catalogue, ses commandes et la visibilité de sa boutique.",
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <PublicInfoScreenNext
      title="Comment ça marche"
      intro="La plateforme relie les acheteurs et les boutiques locales autour d'un parcours simple, centré sur la découverte et la commande."
      sections={sections}
    />
  );
}
