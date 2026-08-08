import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { isAdminRequest } from "@/lib/server/admin-auth";

export async function POST(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "The AI listing key has not been connected yet" }, { status: 503 });
  }

  const { brand, category, era, condition, size, fit, gender, badge, notes, imageUrls } = await req.json();

  const client = new Anthropic({ apiKey });

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

  const content: Anthropic.Messages.ContentBlockParam[] = [
    ...((Array.isArray(imageUrls) ? imageUrls : []).slice(0, 4).map((url: string) => ({
      type: "image" as const,
      source: { type: "url" as const, url },
    }))),
    { type: "text", text: prompt },
  ];

  let msg: Anthropic.Messages.Message;
  try {
    msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 700,
      messages: [
        {
          role: "user",
          content,
        },
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.toLowerCase().includes("credit balance")) {
      return NextResponse.json(
        { error: "AI credits have run out. Add funds in Claude Console billing, then try again." },
        { status: 402 },
      );
    }

    console.error("AI listing generation failed:", error);
    return NextResponse.json(
      { error: "The AI listing service is temporarily unavailable. Please try again." },
      { status: 502 },
    );
  }

  const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";

  try {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Could not parse AI response", raw }, { status: 500 });
  }
}
