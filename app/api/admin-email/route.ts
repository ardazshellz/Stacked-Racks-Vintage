import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { generateCampaignDraft, normalizePromotionCode } from "@/lib/promotions";
import { isAdminRequest } from "@/lib/server/admin-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { subscriberToken } from "@/lib/server/subscriber-token";

export const runtime = "nodejs";

function escapeHtml(value: unknown) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function campaignHtml(body: string, previewText: string, unsubscribeUrl: string) {
  const content = escapeHtml(body)
    .replaceAll("https://stackedracksvintage.co.uk/shop", "__SR_SHOP_LINK__")
    .replaceAll("https://www.vinted.co.uk/member/59714764-stackedracks", "__SR_VINTED_LINK__")
    .replaceAll("https://stackedracksvintage.co.uk", '<a href="https://stackedracksvintage.co.uk" style="color:#F5C300">stackedracksvintage.co.uk</a>')
    .replaceAll("__SR_SHOP_LINK__", '<a href="https://stackedracksvintage.co.uk/shop" style="color:#F5C300">Shop the latest drop →</a>')
    .replaceAll("__SR_VINTED_LINK__", '<a href="https://www.vinted.co.uk/member/59714764-stackedracks" style="color:#F5C300">Stacked Racks on Vinted</a>')
    .replaceAll("\n", "<br>");
  return `<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(previewText)}</div><div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#0a0a0a;color:#fff;padding:32px"><p style="color:#E8500A;font-size:12px;letter-spacing:2px;text-transform:uppercase">Stacked Racks Vintage</p><div style="font-size:16px;line-height:1.7;color:#ddd">${content}</div><p style="margin-top:32px;color:#666;font-size:12px">You are receiving this because you joined the Stacked Racks email list. <a href="${unsubscribeUrl}" style="color:#aaa">Unsubscribe</a>.</p></div>`;
}

async function mailer() {
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const gmailUser = process.env.GMAIL_USER ?? "stackedracksvintage@gmail.com";
  if (!gmailPass || gmailPass.length < 12) throw new Error("Gmail SMTP is not configured");
  return {
    gmailUser,
    transporter: nodemailer.createTransport({ host: "smtp.gmail.com", port: 587, secure: false, auth: { user: gmailUser, pass: gmailPass } }),
  };
}

export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const [subscribersResult, promotionsResult, campaignsResult] = await Promise.all([
    supabase.from("subscribers").select("email,discount_code,consent_source,consented_at,unsubscribed_at,discount_redeemed_at").order("consented_at", { ascending: false }),
    supabase.from("promotion_codes").select("*").order("created_at", { ascending: false }),
    supabase.from("email_campaigns").select("*").order("created_at", { ascending: false }).limit(20),
  ]);
  const error = subscribersResult.error || promotionsResult.error || campaignsResult.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ subscribers: subscribersResult.data ?? [], promotions: promotionsResult.data ?? [], campaigns: campaignsResult.data ?? [] });
}

export async function POST(req: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");
  const supabase = getSupabaseAdmin();

  if (action === "generate") {
    return NextResponse.json({ draft: generateCampaignDraft({ keywords: String(body.keywords ?? ""), recommendedItems: String(body.recommendedItems ?? ""), promotionCode: String(body.promotionCode ?? ""), percentOff: Number(body.percentOff ?? 0) }) });
  }

  if (action === "create-promotion") {
    const code = normalizePromotionCode(body.code);
    const percentOff = Math.round(Number(body.percentOff));
    if (code.length < 4 || percentOff < 1 || percentOff > 100) return NextResponse.json({ error: "Enter a code of at least 4 characters and a discount from 1–100%." }, { status: 400 });
    const maxRedemptions = body.maxRedemptions ? Math.max(1, Math.round(Number(body.maxRedemptions))) : null;
    const { data, error } = await supabase.from("promotion_codes").upsert({ code, percent_off: percentOff, description: String(body.description ?? "").slice(0, 200), active: body.active !== false, expires_at: body.expiresAt || null, max_redemptions: maxRedemptions, updated_at: new Date().toISOString() }, { onConflict: "code" }).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await supabase.from("admin_audit_log").insert({ action: "promotion.saved", target_type: "promotion", target_id: code, details: { percent_off: percentOff } });
    return NextResponse.json({ promotion: data });
  }

  if (action === "cancel-promotion") {
    const code = normalizePromotionCode(body.code);
    if (!code) return NextResponse.json({ error: "Promotion code is required." }, { status: 400 });
    const { data, error } = await supabase.from("promotion_codes").update({ active: false, updated_at: new Date().toISOString() }).eq("code", code).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await supabase.from("admin_audit_log").insert({ action: "promotion.cancelled", target_type: "promotion", target_id: code, details: {} });
    return NextResponse.json({ promotion: data });
  }

  const subject = String(body.subject ?? "").trim().slice(0, 120);
  const previewText = String(body.previewText ?? "").trim().slice(0, 160);
  const emailBody = String(body.body ?? "").trim().slice(0, 12000);
  if (!subject || !emailBody) return NextResponse.json({ error: "The email needs a subject and message." }, { status: 400 });

  if (action === "save-draft") {
    const payload = { subject, preview_text: previewText, body: emailBody, keywords: String(body.keywords ?? "").slice(0, 500), promotion_code: normalizePromotionCode(body.promotionCode) || null, status: "draft", updated_at: new Date().toISOString() };
    const query = body.id ? supabase.from("email_campaigns").update(payload).eq("id", body.id) : supabase.from("email_campaigns").insert(payload);
    const { data, error } = await query.select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ campaign: data });
  }

  if (action === "send-test") {
    const { gmailUser, transporter } = await mailer();
    const recipient = String(body.testEmail || process.env.OWNER_EMAIL || gmailUser).trim();
    await transporter.sendMail({ from: `"Stacked Racks Vintage" <${gmailUser}>`, to: recipient, subject: `[TEST] ${subject}`, html: campaignHtml(emailBody, previewText, "https://stackedracksvintage.co.uk/unsubscribe") });
    return NextResponse.json({ ok: true, sentTo: recipient });
  }

  if (action === "send") {
    if (body.confirm !== "SEND") return NextResponse.json({ error: "Campaign send was not confirmed." }, { status: 400 });
    const { data: subscribers, error: listError } = await supabase.from("subscribers").select("email").is("unsubscribed_at", null).order("consented_at", { ascending: true }).limit(200);
    if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });
    const { gmailUser, transporter } = await mailer();
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://stackedracksvintage.co.uk";
    let sentCount = 0;
    let failedCount = 0;
    for (const subscriber of subscribers ?? []) {
      try {
        const unsubscribeUrl = `${base}/unsubscribe?token=${subscriberToken(subscriber.email)}`;
        await transporter.sendMail({ from: `"Stacked Racks Vintage" <${gmailUser}>`, to: subscriber.email, subject, html: campaignHtml(emailBody, previewText, unsubscribeUrl) });
        sentCount += 1;
      } catch (error) {
        failedCount += 1;
        console.error("Campaign email failed:", error);
      }
    }
    const { data: campaign } = await supabase.from("email_campaigns").insert({ subject, preview_text: previewText, body: emailBody, keywords: String(body.keywords ?? "").slice(0, 500), promotion_code: normalizePromotionCode(body.promotionCode) || null, status: failedCount ? "failed" : "sent", sent_count: sentCount, failed_count: failedCount, sent_at: new Date().toISOString() }).select("*").single();
    await supabase.from("admin_audit_log").insert({ action: "campaign.sent", target_type: "email_campaign", target_id: campaign?.id ?? "", details: { sent_count: sentCount, failed_count: failedCount } });
    return NextResponse.json({ ok: failedCount === 0, sentCount, failedCount });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
