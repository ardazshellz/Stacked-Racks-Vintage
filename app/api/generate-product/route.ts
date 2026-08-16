import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin-auth";
import { sameOrigin, withinRateLimit } from "@/lib/server/request-security";

export const runtime = "nodejs";

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

const OUTPUT_FIELDS = [
  "websiteTitle",
  "websiteDescription",
  "vintedTitle",
  "vintedDescription",
  "suggestedBrand",
  "suggestedCategory",
  "suggestedEra",
  "suggestedCondition",
  "suggestedSize",
  "suggestedGender",
  "suggestedFit",
  "suggestedMarquee",
  "suggestedColour",
  "suggestedMaterial",
  "visibleFlaws",
  "photoFindings",
  "pricingReview",
  "suggestedPriceLow",
  "suggestedPriceHigh",
  "pricingReason",
  "pricingSearchQuery",
] as const;

const LISTING_SCHEMA = {
  type: "object",
  properties: Object.fromEntries(OUTPUT_FIELDS.map((field) => [field, { type: "string" }])),
  required: [...OUTPUT_FIELDS],
  additionalProperties: false,
};

function sentencesOnSeparateLines(value: string, maximum: number) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .filter(Boolean)
    .slice(0, maximum)
    .join("\n");
}

function isProductImageUrl(value: unknown): value is string {
  if (typeof value !== "string" || !process.env.SUPABASE_URL) return false;
  try {
    const imageUrl = new URL(value);
    const supabaseUrl = new URL(process.env.SUPABASE_URL);
    return (
      imageUrl.protocol === "https:" &&
      imageUrl.origin === supabaseUrl.origin &&
      imageUrl.pathname.startsWith("/storage/v1/object/public/product-images/")
    );
  } catch {
    return false;
  }
}

async function imageToGeminiPart(url: string): Promise<GeminiPart | null> {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) return null;

  const mimeType = response.headers.get("content-type")?.split(";")[0] ?? "";
  if (!mimeType.startsWith("image/")) return null;

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 4 * 1024 * 1024) return null;

  return {
    inlineData: {
      mimeType,
      data: Buffer.from(bytes).toString("base64"),
    },
  };
}

export async function POST(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  if (!(await withinRateLimit(req, "admin-ai", 30, 60 * 60))) {
    return NextResponse.json({ error: "AI limit reached. Try again in an hour." }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "The free AI listing key has not been connected yet" }, { status: 503 });
  }

  const { brand, category, era, condition, size, fit, gender, badge, notes, imageUrls, mode } = await req.json();
  const photoMode = mode === "photos";

  const prompt = `You create accurate resale listings for Stacked Racks Vintage, a UK vintage clothing shop.

Known details (some may be blank):
Brand: ${brand || "Unknown"}
Type: ${category || "Unknown"}
Era: ${era || "Unknown"}
Condition: ${condition || "Unknown"}
Size label: ${size || "Unknown"}
Fit: ${fit || "Unknown"}
Department: ${gender || "Unknown"}
Marquee selection: ${badge === "RARE" ? "Yes" : "No"}
Seller notes: ${notes || "None"}

${photoMode ? `PHOTO ANALYSIS TASK:
Study every supplied photo closely. Read visible brand labels, size labels, care labels, model codes and embroidered or printed details. Identify colour, pattern, garment type, likely era cues, fit, condition and visible flaws. If the visible evidence strongly resembles a known product or model, describe it as a possible match in photoFindings and explain the evidence. Never present an unverified match, authenticity, fabric composition or exact year as fact. Populate as many fields as the evidence supports.` : `LISTING TASK:
Combine the known details, seller notes, any previous photo findings and the supplied photos into a polished listing. Treat seller-provided facts as authoritative. Never claim authenticity, precise fabric or an exact year unless the evidence supports it.`}

Writing style:
- websiteDescription: concise and useful; 3-4 short sentences and no more than 80 words total. Cover the strongest design details, condition and fit without flowery filler. Put every sentence on its own line.
- vintedDescription: very easy to scan; 2-3 short factual sentences and no more than 240 characters total. Put every sentence on its own line and include visible flaws.
- Titles must be factual, search-friendly and free from unsupported claims.
- Treat every item as genuine, as confirmed by the seller. Do not use authenticity uncertainty as a reason to lower the price.
- Assess pricing conservatively but never default a potentially collectible piece to an ordinary second-hand price.
- pricingReview must be Needs review for vintage band merchandise, single-stitch or all-over-print T-shirts, dated tour/event pieces, rare football shirts, player-name shirts, tournament patches, designer pieces, unusual collaborations, discontinued models, pre-2005 items with collectible cues, or anything whose identity/value is uncertain. Use Standard for ordinary modern/general sportswear and common high-street pieces.
- suggestedPriceLow and suggestedPriceHigh are realistic GBP resale ranges based on the visible item, condition, size and general market knowledge. They are guidance, not claims of live web research.
- pricingReason must explain the important value signals and any condition/size deductions in plain English.
- pricingSearchQuery must be a precise search phrase for checking sold comparables, including brand, design/model, era and key identifiers where visible.

Return ONLY valid JSON:
{
  "websiteTitle": "max 8 words",
  "websiteDescription": "concise 3-4 sentence website description, each sentence on a new line",
  "vintedTitle": "search-friendly title, max 80 characters",
  "vintedDescription": "short Vinted description, 2-3 sentence lines, max 240 characters, no hashtags",
  "suggestedBrand": "brand or Vintage",
  "suggestedCategory": "best matching category",
  "suggestedEra": "one of 60s,70s,80s,90s,00s,2010s,2020s",
  "suggestedCondition": "one of Excellent,Good,Fair",
  "suggestedSize": "one of XS,S,M,L,XL,XXL; use current value if unreadable",
  "suggestedGender": "one of Mens,Womens",
  "suggestedFit": "one of Regular,Fitted,Baggy,Oversized",
  "suggestedMarquee": "Yes only for an especially distinctive featured piece, otherwise No",
  "suggestedColour": "concise main colour and pattern visible in the photos",
  "suggestedMaterial": "material only when supported by a readable care label or seller notes, otherwise blank",
  "visibleFlaws": "concise visible flaws, or None visible when the photos support that",
  "photoFindings": "2-4 sentences summarising visible evidence, label details and any cautious possible model match",
  "pricingReview": "Needs review or Standard",
  "suggestedPriceLow": "whole-number GBP lower estimate, numbers only",
  "suggestedPriceHigh": "whole-number GBP upper estimate, numbers only",
  "pricingReason": "1-3 plain-English sentences explaining the price range and collectible or ordinary signals",
  "pricingSearchQuery": "precise search phrase for comparable listings"
}`;

  const safeImageUrls = (Array.isArray(imageUrls) ? imageUrls : [])
    .filter(isProductImageUrl)
    .slice(0, 4);
  const loadedImages = await Promise.all(safeImageUrls.map(imageToGeminiPart));
  if (photoMode && !loadedImages.some(Boolean)) {
    return NextResponse.json({ error: "Upload at least one supported photo before analysing" }, { status: 400 });
  }
  const parts: GeminiPart[] = [
    ...loadedImages.filter((part): part is GeminiPart => part !== null),
    { text: prompt },
  ];

  let response: Response;
  try {
    response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            maxOutputTokens: 2_500,
            thinkingConfig: {
              thinkingLevel: "minimal",
            },
            responseFormat: {
              text: {
                mimeType: "APPLICATION_JSON",
                schema: LISTING_SCHEMA,
              },
            },
          },
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );
  } catch (error) {
    console.error("Gemini listing request failed:", error);
    return NextResponse.json(
      { error: "The free AI listing service is temporarily unavailable. Please try again." },
      { status: 502 },
    );
  }

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const message = String(result?.error?.message ?? "");
    console.error("Gemini listing generation failed:", response.status, message);
    if (response.status === 429) {
      return NextResponse.json(
        { error: "The free AI daily limit has been reached. Please try again later." },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { error: "The free AI listing service is temporarily unavailable. Please try again." },
      { status: 502 },
    );
  }

  const raw = result?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text ?? "")
    .join("")
    .trim();

  try {
    const cleaned = String(raw ?? "").replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const listing = Object.fromEntries(
      OUTPUT_FIELDS.map((field) => [field, typeof parsed[field] === "string" ? parsed[field] : ""]),
    );
    listing.websiteDescription = sentencesOnSeparateLines(listing.websiteDescription, 4);
    listing.vintedDescription = sentencesOnSeparateLines(listing.vintedDescription, 3);
    if (!listing.websiteTitle || !listing.vintedTitle || !listing.vintedDescription) {
      throw new Error("Missing required listing fields");
    }
    return NextResponse.json(listing);
  } catch (error) {
    console.error("Could not parse Gemini listing response:", error);
    return NextResponse.json({ error: "The AI response was incomplete. Please try again." }, { status: 502 });
  }
}
