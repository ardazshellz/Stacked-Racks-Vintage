import type { Product } from "./products";

const PRODUCT_META_PREFIX = "__SR_PRODUCT_META__";

function parseEditorialMeta(value: string | null) {
  if (!value?.startsWith(PRODUCT_META_PREFIX)) {
    return { editorialStory: value ?? undefined, garmentDetails: undefined };
  }
  try {
    const meta = JSON.parse(value.slice(PRODUCT_META_PREFIX.length)) as {
      editorialStory?: string;
      garmentDetails?: Product["garmentDetails"];
      sku?: string;
      costPrice?: number;
      storageLocation?: string;
      source?: string;
      vintedUrl?: string;
      listingStatus?: Product["listingStatus"];
      pricingStatus?: Product["pricingStatus"];
      suggestedPriceLow?: number;
      suggestedPriceHigh?: number;
      pricingReason?: string;
      pricingSearchQuery?: string;
      pricingReviewedAt?: string;
      secondaryGender?: Product["secondaryGender"];
      secondarySize?: string;
      displaySize?: string;
    };
    return {
      editorialStory: meta.editorialStory || undefined,
      garmentDetails: meta.garmentDetails,
      sku: meta.sku,
      costPrice: meta.costPrice,
      storageLocation: meta.storageLocation,
      source: meta.source,
      vintedUrl: meta.vintedUrl,
      listingStatus: meta.listingStatus,
      pricingStatus: meta.pricingStatus,
      suggestedPriceLow: meta.suggestedPriceLow,
      suggestedPriceHigh: meta.suggestedPriceHigh,
      pricingReason: meta.pricingReason,
      pricingSearchQuery: meta.pricingSearchQuery,
      pricingReviewedAt: meta.pricingReviewedAt,
      secondaryGender: meta.secondaryGender,
      secondarySize: meta.secondarySize,
      displaySize: meta.displaySize,
    };
  } catch {
    return { editorialStory: undefined, garmentDetails: undefined };
  }
}

function editorialMeta(product: Omit<Product, "id">) {
  const details = product.garmentDetails;
  const hasDetails = details && Object.values(details).some((value) => value?.trim());
  const hasInventoryMeta = Boolean(
    product.sku ||
    product.costPrice ||
    product.storageLocation ||
    product.source ||
    product.vintedUrl ||
    product.listingStatus ||
    product.pricingStatus ||
    product.suggestedPriceLow ||
    product.suggestedPriceHigh ||
    product.pricingReason ||
    product.pricingSearchQuery ||
    product.pricingReviewedAt ||
    product.secondaryGender ||
    product.secondarySize ||
    product.displaySize
  );
  if (!hasDetails && !hasInventoryMeta) return product.editorialStory?.trim() || null;
  return `${PRODUCT_META_PREFIX}${JSON.stringify({
    editorialStory: product.editorialStory?.trim() || undefined,
    garmentDetails: details,
    sku: product.sku?.trim() || undefined,
    costPrice: Number(product.costPrice) || undefined,
    storageLocation: product.storageLocation?.trim() || undefined,
    source: product.source?.trim() || undefined,
    vintedUrl: product.vintedUrl?.trim() || undefined,
    listingStatus: product.listingStatus,
    pricingStatus: product.pricingStatus,
    suggestedPriceLow: Number(product.suggestedPriceLow) || undefined,
    suggestedPriceHigh: Number(product.suggestedPriceHigh) || undefined,
    pricingReason: product.pricingReason?.trim() || undefined,
    pricingSearchQuery: product.pricingSearchQuery?.trim() || undefined,
    pricingReviewedAt: product.pricingReviewedAt,
    secondaryGender: product.secondaryGender,
    secondarySize: product.secondarySize?.trim() || undefined,
    displaySize: product.displaySize?.trim() || undefined,
  })}`;
}

export interface ProductRow {
  id: string;
  name: string;
  brand: string;
  size: string;
  gender: Product["gender"];
  price: number | string;
  category: string;
  badge: Product["badge"];
  rare_badge: Product["rareBadge"] | null;
  stock: number;
  condition: Product["condition"];
  era: Product["era"];
  fit: Product["fit"];
  listed_date: string;
  description: string;
  editorial_story: string | null;
  image_urls: string[] | null;
  vinted_title: string | null;
  vinted_description: string | null;
  reserved_until?: string | null;
  reservation_token?: string | null;
}

export function rowToProduct(row: ProductRow): Product {
  const meta = parseEditorialMeta(row.editorial_story);
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    size: row.size,
    gender: row.gender,
    price: Number(row.price),
    category: row.category,
    badge: row.badge,
    rareBadge: row.rare_badge ?? undefined,
    stock: row.stock,
    condition: row.condition,
    era: row.era,
    fit: row.fit,
    listedDate: row.listed_date,
    description: row.description,
    editorialStory: meta.editorialStory,
    garmentDetails: meta.garmentDetails,
    sku: meta.sku,
    costPrice: meta.costPrice,
    storageLocation: meta.storageLocation,
    source: meta.source,
    vintedUrl: meta.vintedUrl,
    listingStatus: meta.listingStatus,
    pricingStatus: meta.pricingStatus,
    suggestedPriceLow: meta.suggestedPriceLow,
    suggestedPriceHigh: meta.suggestedPriceHigh,
    pricingReason: meta.pricingReason,
    pricingSearchQuery: meta.pricingSearchQuery,
    pricingReviewedAt: meta.pricingReviewedAt,
    secondaryGender: meta.secondaryGender,
    secondarySize: meta.secondarySize,
    displaySize: meta.displaySize,
    imageUrls: row.image_urls ?? [],
    vintedTitle: row.vinted_title ?? undefined,
    vintedDescription: row.vinted_description ?? undefined,
  };
}

export function productToRow(product: Omit<Product, "id">) {
  return {
    name: product.name.trim(),
    brand: product.brand.trim(),
    size: product.size,
    gender: product.gender,
    price: product.price,
    category: product.category,
    badge: product.badge,
    rare_badge: product.rareBadge ?? null,
    stock: product.stock,
    condition: product.condition,
    era: product.era,
    fit: product.fit,
    listed_date: product.listedDate,
    description: product.description.trim(),
    editorial_story: editorialMeta(product),
    image_urls: product.imageUrls ?? [],
    vinted_title: product.vintedTitle?.trim() || null,
    vinted_description: product.vintedDescription?.trim() || null,
    updated_at: new Date().toISOString(),
  };
}
