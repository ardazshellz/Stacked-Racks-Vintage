import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin-auth";

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
] as const;

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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "The free AI listing key has not been connected yet" }, { status: 503 });
  }

  const { brand, category, era, condition, size, fit, gender, badge, notes, imageUrls } = await req.json();

  const prompt = `You create accurate resale listings for Stacked Racks Vintage, a UK vintage clothing shop.

Known details (some may be blank):
Brand: ${brand || "Unknown"}
Type: ${category || "Unknown"}
Era: ${era || "Unknown"}
Condition: ${condition || "Unknown"}
Size label: ${size || "Unknown"}
Fit: ${fit || "Unknown"}
Department: ${gender || "Unknown"}
Rarity: ${badge === "RARE" ? "Rare / collector piece" : "Standard listing"}
Seller notes: ${notes || "None"}

Study the supplied photos when present. Never claim an item is authentic, a precise fabric, or an exact year unless the supplied details prove it. Mention visible wear honestly. Return ONLY valid JSON:
{
  "websiteTitle": "max 7 words",
  "websiteDescription": "2-3 concise sentences",
  "vintedTitle": "search-friendly title, max 80 characters",
  "vintedDescription": "clear Vinted-ready description with item, colour, labelled size, fit, condition and visible flaws; no hashtags",
  "suggestedBrand": "brand or Vintage",
  "suggestedCategory": "best matching category",
  "suggestedEra": "one of 60s,70s,80s,90s,00s,2010s,2020s",
  "suggestedCondition": "one of Excellent,Good,Fair"
}`;

  const safeImageUrls = (Array.isArray(imageUrls) ? imageUrls : [])
    .filter(isProductImageUrl)
    .slice(0, 4);
  const loadedImages = await Promise.all(safeImageUrls.map(imageToGeminiPart));
  const parts: GeminiPart[] = [
    ...loadedImages.filter((part): part is GeminiPart => part !== null),
    { text: prompt },
  ];

  let response: Response;
  try {
    response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: 700,
            responseMimeType: "application/json",
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
    if (!listing.websiteTitle || !listing.vintedTitle || !listing.vintedDescription) {
      throw new Error("Missing required listing fields");
    }
    return NextResponse.json(listing);
  } catch (error) {
    console.error("Could not parse Gemini listing response:", error);
    return NextResponse.json({ error: "The AI response was incomplete. Please try again." }, { status: 502 });
  }
}
