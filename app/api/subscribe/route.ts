import { NextResponse } from "next/server";

// To enable real email sending:
// 1. npm install resend
// 2. Add RESEND_API_KEY to .env.local
// 3. Uncomment the Resend block below

const VOUCHER_CODE = "VINTAGE10";
const FROM_EMAIL = "hello@stackedracks.co.uk"; // update once domain email is set up
const OWNER_EMAIL = process.env.OWNER_EMAIL ?? "zakeryshelley1997@gmail.com";

export async function POST(req: Request) {
  let email = "";
  try {
    const body = await req.json();
    email = (body.email ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  // ── Uncomment once Resend is installed ──────────────────────────────────────
  // import { Resend } from "resend";
  // const resend = new Resend(process.env.RESEND_API_KEY);
  //
  // await resend.emails.send({
  //   from: FROM_EMAIL,
  //   to: email,
  //   subject: "Your 10% Discount Code — Stacked Racks Vintage",
  //   html: buildCustomerEmail(VOUCHER_CODE),
  // });
  //
  // await resend.emails.send({
  //   from: FROM_EMAIL,
  //   to: OWNER_EMAIL,
  //   subject: `New signup: ${email}`,
  //   html: `<p>New email signup: <strong>${email}</strong></p>`,
  // });
  // ────────────────────────────────────────────────────────────────────────────

  return NextResponse.json({ ok: true, code: VOUCHER_CODE });
}

function buildCustomerEmail(code: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Georgia,serif;color:#fff;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid rgba(255,255,255,0.08);">

        <!-- Orange top bar -->
        <tr><td style="background:#E8500A;height:4px;font-size:0;">&nbsp;</td></tr>

        <!-- Header -->
        <tr><td style="padding:36px 40px 0;text-align:center;">
          <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#E8500A;font-family:sans-serif;">Stacked Racks Vintage</p>
          <h1 style="margin:0;font-size:28px;font-weight:900;color:#fff;letter-spacing:0.05em;">Your 10% Off Code</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:28px 40px;">
          <p style="margin:0 0 20px;font-size:14px;color:rgba(255,255,255,0.6);line-height:1.7;">
            Thanks for signing up. Here's your exclusive discount — valid on any item in the collection.
          </p>

          <!-- Code box -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background:#1a1a1a;border:1px solid rgba(232,80,10,0.35);padding:20px;text-align:center;">
              <p style="margin:0 0 6px;font-size:10px;letter-spacing:0.25em;text-transform:uppercase;color:rgba(255,255,255,0.4);font-family:sans-serif;">Your discount code</p>
              <p style="margin:0;font-size:32px;font-weight:900;letter-spacing:0.3em;color:#E8500A;font-family:sans-serif;">${code}</p>
            </td></tr>
          </table>

          <!-- How to use -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;background:#161616;border:1px solid rgba(255,255,255,0.05);">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 12px;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#fff;font-family:sans-serif;font-weight:700;">How to use it</p>
              <ol style="margin:0;padding-left:18px;color:rgba(255,255,255,0.6);font-size:13px;line-height:2;">
                <li>Browse the collection at <a href="https://stackedracks.co.uk" style="color:#E8500A;">stackedracks.co.uk</a></li>
                <li>Find something you love and click it</li>
                <li>Select <strong style="color:#fff;">Checkout with Card</strong></li>
                <li>Enter <strong style="color:#E8500A;letter-spacing:0.1em;">${code}</strong> in the discount code field</li>
                <li>10% comes off your total automatically</li>
              </ol>
            </td></tr>
          </table>

          <p style="margin:28px 0 0;font-size:12px;color:rgba(255,255,255,0.3);line-height:1.7;">
            This code is for one use and applies to any item. If you have any questions, message us on
            <a href="https://instagram.com/stacked_racks_vintage" style="color:#E8500A;">Instagram</a>.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 40px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
          <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.2);font-family:sans-serif;letter-spacing:0.15em;">
            STACKED RACKS VINTAGE · LONDON, UK
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
