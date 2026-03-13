export function toShopSlug(name: string): string {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

  return normalized || "boutique";
}

export function getShopHref(shop: { id: string; name: string; slug?: string | null }): string {
  const slug = (shop.slug ?? "").trim() || toShopSlug(shop.name);
  return `/shop/${encodeURIComponent(slug)}`;
}
