import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set in .env.local" }, { status: 500 });
  }

  const { brand, category, era, condition, size, fit, gender, badge } = await req.json();

  const client = new Anthropic({ apiKey });

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `You write product listings for a London vintage clothing shop called Stacked Racks Vintage. Write a title and description for this item:

Brand: ${brand || "Unknown"}
Type: ${category}
Era: ${era}
Condition: ${condition}
Size: ${size}
Fit: ${fit}
For: ${gender}
${badge === "RARE" ? "Rarity: Rare / collector piece" : ""}

Rules:
- Title: max 7 words. Format: Brand + item type + era. No hype words. Example: "Nike 90s Windbreaker Jacket" or "Burberry Nova Check Overshirt"
- Description: 2–3 short sentences. Honest, atmospheric, knowledgeable. Mention the era feel, what makes it stand out, and condition. No clichés like "timeless" or "must-have".
- Tone: confident, like a person who really knows vintage

Return ONLY valid JSON with no extra text:
{"title": "...", "description": "..."}`,
      },
    ],
  });

  const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";

  try {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    return NextResponse.json({ title: parsed.title ?? "", description: parsed.description ?? "" });
  } catch {
    return NextResponse.json({ error: "Could not parse AI response", raw }, { status: 500 });
  }
}
