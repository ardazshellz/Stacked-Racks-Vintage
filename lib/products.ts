export type RareBadge = "ARCHIVE" | "1 OF 1" | "GRAIL" | "ERA PIECE";
export type Condition = "Excellent" | "Good" | "Fair";
export type Era = "60s" | "70s" | "80s" | "90s" | "00s" | "2010s" | "2020s";
export const ERAS = ["60s", "70s", "80s", "90s", "00s", "2010s", "2020s"] as const;
export type Fit = "Regular" | "Fitted" | "Baggy" | "Oversized";

export interface GarmentDetails {
  colour?: string;
  material?: string;
  pitToPit?: string;
  length?: string;
  sleeve?: string;
  flaws?: string;
}

export interface Product {
  id: number | string;
  name: string;
  brand: string;
  size: string;
  gender: "Mens" | "Womens";
  price: number;
  category: string;
  badge: "NEW" | "RARE";
  rareBadge?: RareBadge;
  stock: number; // 0 = sold out
  condition: Condition;
  era: Era;
  fit: Fit;
  listedDate: string; // ISO date — NEW badge shown for 14 days
  description: string;
  editorialStory?: string;
  imageUrls?: string[];
  vintedTitle?: string;
  vintedDescription?: string;
  garmentDetails?: GarmentDetails;
  sku?: string;
  costPrice?: number;
  storageLocation?: string;
  source?: string;
}

export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export const FITS = ["Regular", "Fitted", "Baggy", "Oversized"] as const;
export const CATEGORIES = [
  "T-Shirts & Tops",
  "Hoodies",
  "Jackets",
  "Sweatshirts",
  "Tracksuits",
  "Joggers & Tracksuit Bottoms",
  "Trousers",
  "Shorts",
  "Football Shirts",
  "Headwear",
  "Bags & Backpacks",
  "Swimwear",
  "Shoes",
] as const;

export const ALL_BRANDS = [
  "Nike", "Adidas", "Burberry", "Coogi", "Champion", "Fila", "Vintage",
] as const;

/** Every product is included in New In for 14 days from listedDate. */
export function isNew(p: Product): boolean {
  const listedAt = new Date(`${p.listedDate}T00:00:00`).getTime();
  if (!Number.isFinite(listedAt)) return false;
  const age = Date.now() - listedAt;
  return age >= 0 && age < 14 * 24 * 60 * 60 * 1000;
}

/**
 * Returns brands that have ≥1 in-stock item, ordered by item-count desc.
 * Ties are broken alphabetically so the order is always deterministic.
 */
export function getBrandsInStock(prods: Product[] = products): string[] {
  const counts: Record<string, number> = {};
  prods.forEach((p) => {
    if (p.stock > 0) counts[p.brand] = (counts[p.brand] ?? 0) + 1;
  });
  return Object.entries(counts)
    .sort(([a, ca], [b, cb]) => cb - ca || a.localeCompare(b))
    .map(([brand]) => brand);
}

export const products: Product[] = [
  {
    id: 1,
    name: "Burberry Nova Check Jacket",
    brand: "Burberry",
    size: "L",
    gender: "Mens",
    price: 185,
    category: "Jackets",
    badge: "RARE",
    rareBadge: "ARCHIVE",
    stock: 1,
    condition: "Excellent",
    era: "90s",
    fit: "Regular",
    listedDate: "2026-03-15",
    description:
      "Iconic Burberry Nova Check pattern jacket. A genuine investment-grade piece in exceptional vintage condition. Increasingly hard to find — this is a true collector's item.",
    editorialStory:
      "1996 original. Authenticated Burberry Nova Check in classic camel & black. Only a handful known to exist unworn in this condition. The one you've been waiting for.",
  },
  {
    id: 2,
    name: "Coogi Knit Sweater",
    brand: "Coogi",
    size: "XL",
    gender: "Mens",
    price: 120,
    category: "Sweatshirts",
    badge: "NEW",
    stock: 2,
    condition: "Excellent",
    era: "90s",
    fit: "Oversized",
    listedDate: "2026-05-10",
    description:
      "Classic Coogi multi-colour knit sweater, as worn by hip-hop legends throughout the 90s. Bold, vibrant and in great vintage condition.",
  },
  {
    id: 3,
    name: "Vintage Leather Bomber",
    brand: "Vintage",
    size: "M",
    gender: "Mens",
    price: 145,
    category: "Jackets",
    badge: "RARE",
    rareBadge: "1 OF 1",
    stock: 1,
    condition: "Excellent",
    era: "80s",
    fit: "Regular",
    listedDate: "2026-04-01",
    description:
      "Premium vintage leather bomber jacket with genuine leather and aged patina that only gets better with time. A rare find in this condition.",
    editorialStory:
      "Classic 80s silhouette. Full-grain leather with a natural patina aged to perfection over four decades. The kind of jacket that carries real stories.",
  },
  {
    id: 4,
    name: "Nike 90s Track Top",
    brand: "Nike",
    size: "L",
    gender: "Mens",
    price: 65,
    category: "Jackets",
    badge: "NEW",
    stock: 3,
    condition: "Good",
    era: "90s",
    fit: "Regular",
    listedDate: "2026-05-14",
    description:
      "Classic Nike 90s track top in iconic colourway. Features the original swoosh embroidery in perfect condition with light vintage wear.",
  },
  {
    id: 5,
    name: "Adidas Stripe Jacket",
    brand: "Adidas",
    size: "S",
    gender: "Womens",
    price: 55,
    category: "Jackets",
    badge: "NEW",
    stock: 2,
    condition: "Excellent",
    era: "00s",
    fit: "Regular",
    listedDate: "2026-05-15",
    description:
      "Adidas three-stripe jacket from the late 90s/early 00s. Classic silhouette in excellent condition — a staple of the vintage streetwear wardrobe.",
  },
  {
    id: 6,
    name: "Vintage Denim Jacket",
    brand: "Vintage",
    size: "M",
    gender: "Womens",
    price: 48,
    category: "Jackets",
    badge: "NEW",
    stock: 3,
    condition: "Good",
    era: "90s",
    fit: "Baggy",
    listedDate: "2026-04-25",
    description:
      "Classic vintage denim jacket with characterful fading and a beautiful wash. Perfect for layering — a true wardrobe essential with real personality.",
  },
  {
    id: 7,
    name: "Retro Sports Jersey",
    brand: "Vintage",
    size: "XL",
    gender: "Mens",
    price: 55,
    category: "Football Shirts",
    badge: "NEW",
    stock: 0,
    condition: "Good",
    era: "90s",
    fit: "Oversized",
    listedDate: "2026-04-10",
    description:
      "Authentic retro sports jersey from the golden era. Mesh fabric construction with original team graphics in great condition.",
  },
  {
    id: 8,
    name: "Vintage Check Blazer",
    brand: "Vintage",
    size: "M",
    gender: "Mens",
    price: 95,
    category: "Jackets",
    badge: "RARE",
    rareBadge: "GRAIL",
    stock: 1,
    condition: "Excellent",
    era: "90s",
    fit: "Oversized",
    listedDate: "2026-05-05",
    description:
      "Standout vintage check blazer with an oversized 90s cut. Rarely seen in this condition — a bold statement piece that commands attention.",
    editorialStory:
      "Deadstock condition. Original tags still attached. Not for everyone — for the right one. This is the piece you'll still have in 20 years.",
  },
  {
    id: 9,
    name: "90s Puffer Jacket",
    brand: "Vintage",
    size: "L",
    gender: "Womens",
    price: 75,
    category: "Jackets",
    badge: "NEW",
    stock: 2,
    condition: "Good",
    era: "90s",
    fit: "Oversized",
    listedDate: "2026-04-28",
    description:
      "Chunky 90s puffer jacket with original fill and excellent condition. The OG silhouette that started the puffer trend everyone chases today.",
  },
  {
    id: 10,
    name: "Champion Hoodie Vintage",
    brand: "Champion",
    size: "L",
    gender: "Mens",
    price: 45,
    category: "Hoodies",
    badge: "NEW",
    stock: 4,
    condition: "Excellent",
    era: "90s",
    fit: "Regular",
    listedDate: "2026-05-16",
    description:
      "Authentic Champion reverse weave hoodie from the 90s. The original Champion C logo embroidery with heavyweight cotton that lasts forever.",
  },
  {
    id: 11,
    name: "Fila Vintage Track Suit",
    brand: "Fila",
    size: "M",
    gender: "Mens",
    price: 85,
    category: "Jackets",
    badge: "RARE",
    rareBadge: "ERA PIECE",
    stock: 1,
    condition: "Excellent",
    era: "90s",
    fit: "Regular",
    listedDate: "2026-04-20",
    description:
      "Complete Fila vintage track suit set in the iconic Fila colourway. A matching full set in this condition is extremely rare — grab it before it goes.",
    editorialStory:
      "1992 full matching set. Both jacket and bottoms in the iconic Fila colourway. Rarely found complete like this. An era-defining piece from peak 90s Italian sportswear.",
  },
  {
    id: 12,
    name: "Vintage NBA Jersey",
    brand: "Vintage",
    size: "XL",
    gender: "Mens",
    price: 70,
    category: "Football Shirts",
    badge: "NEW",
    stock: 3,
    condition: "Good",
    era: "90s",
    fit: "Oversized",
    listedDate: "2026-05-01",
    description:
      "Authentic NBA jersey from the golden era of basketball. Original team graphics with mesh construction — a must-have for streetwear collectors.",
  },
];
