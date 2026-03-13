type CategoryNode = {
  id: string;
  label: string;
  icon: string;
};

type CategoryGroup = CategoryNode & {
  children: CategoryNode[];
};

export const CATEGORY_GROUPS: readonly CategoryGroup[] = [
  {
    id: "alimentation",
    label: "Alimentation",
    icon: "🥐",
    children: [
      { id: "gourmand", label: "Épicerie fine", icon: "🍫" },
      { id: "boucherie", label: "Boucherie", icon: "🥩" },
      { id: "boulangerie", label: "Boulangerie / Pâtisserie", icon: "🥖" },
      { id: "supermarche", label: "Supermarché", icon: "🛒" },
      { id: "frais", label: "Produits frais", icon: "🧀" },
      { id: "vin", label: "Vins, bières & spiritueux", icon: "🍷" },
    ],
  },
  {
    id: "artistique",
    label: "Artistique",
    icon: "🎭",
    children: [
      { id: "papeterie", label: "Papeterie", icon: "🖊️" },
      { id: "ceramique", label: "Céramique", icon: "🏺" },
      { id: "peinture", label: "Peinture", icon: "🖌️" },
      { id: "illustration", label: "Illustration", icon: "🖼️" },
      { id: "art", label: "Art & créations", icon: "🎨" },
      { id: "artisanat", label: "Artisanat & fait main", icon: "🛋️" },
    ],
  },
  {
    id: "mode-beaute",
    label: "Mode & Beauté",
    icon: "👗",
    children: [
      { id: "mode", label: "Mode", icon: "👗" },
      { id: "beaute", label: "Beauté & cosmétiques", icon: "💄" },
      { id: "bijoux", label: "Bijoux & montres", icon: "💎" },
      { id: "bienetre", label: "Bien-être", icon: "🧴" },
    ],
  },
  {
    id: "maison-jardin",
    label: "Maison & Jardin",
    icon: "🏡",
    children: [
      { id: "deco", label: "Déco & maison", icon: "🕯️" },
      { id: "bricolage", label: "Bricolage & jardin", icon: "🧰" },
      { id: "fleurs", label: "Fleurs & plantes", icon: "🌸" },
    ],
  },
  {
    id: "famille-loisirs",
    label: "Famille & Loisirs",
    icon: "🎉",
    children: [
      { id: "bebe", label: "Bébé & enfants", icon: "👶" },
      { id: "jouets", label: "Jouets & jeux", icon: "🧸" },
      { id: "livres", label: "Livres & papeterie", icon: "📚" },
      { id: "sport", label: "Sport & loisirs", icon: "🏃" },
      { id: "hightech", label: "High-tech & accessoires", icon: "📱" },
      { id: "animaux", label: "Animaux", icon: "🐶" },
      { id: "auto", label: "Auto & vélo", icon: "🚗" },
    ],
  },
] as const;

export const CATEGORY_SUBCATEGORIES: readonly CategoryNode[] = CATEGORY_GROUPS.flatMap(
  (group) => group.children
);

export const CATEGORY_GROUPS_WITH_ALL: readonly CategoryNode[] = [
  { id: "all", label: "Cadeaux & Idées cadeaux", icon: "gift-custom" },
  ...CATEGORY_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    icon: group.icon,
  })),
] as const;

export const CATEGORIES = [
  { id: "all", label: "Cadeaux & Idées cadeaux", icon: "gift-custom" },
  ...CATEGORY_SUBCATEGORIES,
] as const;

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  [...CATEGORY_GROUPS_WITH_ALL, ...CATEGORY_SUBCATEGORIES].map((category) => [
    category.id,
    category.label,
  ])
);

export const CATEGORY_PARENT_BY_ID: Record<string, string> = Object.fromEntries(
  CATEGORY_GROUPS.flatMap((group) =>
    group.children.map((child) => [child.id, group.id] as const)
  )
);

export function getCategoryLabel(categoryId: string): string {
  return CATEGORY_LABELS[categoryId] ?? categoryId;
}

export function matchesCategoryFilter(categoryId: string, filterId: string): boolean {
  if (filterId === "all") return true;
  if (categoryId === filterId) return true;
  return CATEGORY_PARENT_BY_ID[categoryId] === filterId;
}

export const ONBOARDING_SLIDES = [
  {
    emoji: "gift-custom",
    title: "Trouvez le cadeau parfait, près de chez vous",
    description:
      "Parcourez les boutiques locales de votre quartier et découvrez des cadeaux uniques et artisanaux.",
  },
  {
    emoji: "🚀",
    title: "Retrait rapide ou livraison",
    description:
      "Commandez en ligne en quelques clics et choisissez le mode de retrait qui vous convient.",
  },
  {
    emoji: "💖",
    title: "Soutenez le commerce local",
    description:
      "Chaque commande aide les commerçants de votre ville à grandir durablement.",
  },
] as const;
