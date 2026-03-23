export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { ProductScreenNext } from "../../../src/app/components/screens/ProductScreenNext";
import { fetchProductById } from "../../../src/app/services/catalog";
import { getProductHref } from "../../../src/app/utils/shopRouting";

type LegacyProductPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ preview?: string | string[] }>;
};

export default async function ProductPage({ params, searchParams }: LegacyProductPageProps) {
  const { id } = await params;
  const resolvedSearchParams = (searchParams ? await searchParams : undefined) ?? {};
  const preview =
    typeof resolvedSearchParams.preview === "string"
      ? resolvedSearchParams.preview
      : resolvedSearchParams.preview?.[0];

  if (preview === "1") {
    return <ProductScreenNext />;
  }

  const product = await fetchProductById(id);
  if (product) {
    redirect(
      getProductHref({
        id: product.id,
        shopSlug: product.shopSlug,
        shopName: product.shopName,
      })
    );
  }

  return <ProductScreenNext />;
}
