import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

const VOUCHER_CODE = "VINTAGE10";

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export async function POST(req: Request) {
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
          <strong style="color:#E8500A;font-size:28px;letter-spacing:5px">${VOUCHER_CODE}</strong>
        </div>
        <p><a href="https://stackedracksvintage.co.uk/shop" style="color:#F5C300">Browse the latest drop →</a></p>
        <p style="color:#666;font-size:12px">You received this because you requested a first-order discount at stackedracksvintage.co.uk.</p>
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

  return NextResponse.json({ ok: true, code: VOUCHER_CODE });
}
