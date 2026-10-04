import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { welcomeEmailHtml } from "@/lib/email-html";
import { productSizeLabel } from "@/lib/products";
import { loadPublicEmailProducts } from "@/lib/server/email-products";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { sameOrigin, withinRateLimit } from "@/lib/server/request-security";
import { subscriberToken } from "@/lib/server/subscriber-token";

export const runtime = "nodejs";

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const gmailUser = process.env.GMAIL_USER ?? "stackedracksvintage@gmail.com";
  const ownerEmail = process.env.OWNER_EMAIL ?? gmailUser;
  if (!gmailPass || gmailPass.length < 12) {
    return NextResponse.json({ error: "Email signup is temporarily unavailable" }, { status: 503 });
  }

  let email = "";
  try {
    const body = await req.json();
    email = String(body.email ?? "").trim().toLowerCase().slice(0, 254);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!validEmail(email)) return NextResponse.json({ error: "Please enter a valid email" }, { status: 400 });
  if (!(await withinRateLimit(req, "email-signup", 5, 60 * 60, email))) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase.from("subscribers").select("discount_code").eq("email", email).maybeSingle();
  const subscriberCode = existing?.discount_code || `RACKS-${randomBytes(3).toString("hex").toUpperCase()}`;
  const { error: subscriberError } = await supabase.from("subscribers").upsert({
    email,
    discount_code: subscriberCode,
    consent_source: "website",
    consented_at: new Date().toISOString(),
    unsubscribed_at: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "email" });
  if (subscriberError) return NextResponse.json({ error: "Could not save your subscription" }, { status: 500 });
  const unsubscribeUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://stackedracksvintage.co.uk"}/unsubscribe?token=${subscriberToken(email)}`;

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: gmailUser, pass: gmailPass },
  });

  let latestItems: Parameters<typeof welcomeEmailHtml>[2] = [];
  try {
    latestItems = (await loadPublicEmailProducts()).items
      .slice(0, 6)
      .map((item) => ({ id: item.id, name: item.name, size: productSizeLabel(item), price: item.price, imageUrls: item.imageUrls }));
  } catch (error) {
    console.error("Welcome email items load failed:", error);
  }

  try {
    await transporter.sendMail({
      from: `"Stacked Racks Vintage" <${gmailUser}>`,
      to: email,
      subject: "Your 10% off code — Stacked Racks Vintage",
      html: welcomeEmailHtml(subscriberCode, unsubscribeUrl, latestItems),
    });
  } catch (error) {
    console.error("Signup email failed:", error);
    return NextResponse.json({ error: "We could not send the email. Please try again." }, { status: 502 });
  }

  try {
    await transporter.sendMail({
      from: `"Stacked Racks Vintage" <${gmailUser}>`,
      to: ownerEmail,
      subject: "New Stacked Racks email signup",
      html: `<p>New email signup: <strong>${escapeHtml(email)}</strong></p>`,
    });
  } catch (error) {
    console.error("Signup owner notification failed:", error);
  }

  return NextResponse.json({ ok: true });
}
