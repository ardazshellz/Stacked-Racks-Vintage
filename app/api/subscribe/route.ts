import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { sameOrigin, withinRateLimit } from "@/lib/server/request-security";
import { subscriberToken } from "@/lib/server/subscriber-token";
import { WELCOME_DISCOUNT_CODE } from "@/lib/discount";

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

  try {
    await transporter.sendMail({
      from: `"Stacked Racks Vintage" <${gmailUser}>`,
      to: email,
      subject: "Your 10% off code — Stacked Racks Vintage",
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;background:#0a0a0a;color:#fff;padding:32px">
        <p style="color:#E8500A;font-size:12px;letter-spacing:2px;text-transform:uppercase">Stacked Racks Vintage</p>
        <h1>Your 10% off code</h1>
        <p style="color:#aaa">Thanks for signing up. Enter this code in the discount-code box on our checkout page.</p>
        <div style="background:#111;border:1px solid #E8500A;padding:20px;text-align:center;margin:24px 0">
          <strong style="color:#E8500A;font-size:28px;letter-spacing:5px">${WELCOME_DISCOUNT_CODE}</strong>
        </div>
        <p><a href="https://stackedracksvintage.co.uk/shop" style="color:#F5C300">Browse the latest drop →</a></p>
        <p style="color:#666;font-size:12px">You received this because you requested a first-order discount at stackedracksvintage.co.uk. <a href="${unsubscribeUrl}" style="color:#aaa">Unsubscribe</a>.</p>
      </div>`,
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

  return NextResponse.json({ ok: true, code: WELCOME_DISCOUNT_CODE });
}
