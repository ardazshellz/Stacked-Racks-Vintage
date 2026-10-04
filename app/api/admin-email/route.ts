import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { generateCampaignDraft, normalizePromotionCode } from "@/lib/promotions";
import { campaignHtml, dropEmailHtml, validDropItemId } from "@/lib/email-html";
import { productSizeLabel } from "@/lib/products";
import { isAdminRequest } from "@/lib/server/admin-auth";
import { loadPublicEmailProducts } from "@/lib/server/email-products";
import { sameOrigin } from "@/lib/server/request-security";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { subscriberToken } from "@/lib/server/subscriber-token";

export const runtime = "nodejs";

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
  try {
    const supabase = getSupabaseAdmin();
    const [subscribersResult, promotionsResult, campaignsResult, products] = await Promise.all([
      supabase.from("subscribers").select("email,discount_code,consent_source,consented_at,unsubscribed_at,discount_redeemed_at").order("consented_at", { ascending: false }),
      supabase.from("promotion_codes").select("*").order("created_at", { ascending: false }),
      supabase.from("email_campaigns").select("*").order("created_at", { ascending: false }).limit(20),
      loadPublicEmailProducts(),
    ]);
    const error = subscribersResult.error || promotionsResult.error || campaignsResult.error;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ subscribers: subscribersResult.data ?? [], promotions: promotionsResult.data ?? [], campaigns: campaignsResult.data ?? [], ...products }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Email marketing load failed:", error);
    return NextResponse.json({ error: "Could not load email marketing data." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const action = String(body.action ?? "");
  const supabase = getSupabaseAdmin();

  if (action === "send-drop-test" || action === "send-drop") {
    const test = action === "send-drop-test";
    if (!test && body.confirm !== "SEND") return NextResponse.json({ error: "Drop send was not confirmed." }, { status: 400 });
    if (!Array.isArray(body.itemIds) || body.itemIds.length < 1 || body.itemIds.length > 12 || !body.itemIds.every(validDropItemId)) {
      return NextResponse.json({ error: "Choose 1–12 valid items." }, { status: 400 });
    }
    const itemIds = [...new Set<string>(body.itemIds.map(String))];
    const subject = String(body.subject ?? "").trim().slice(0, 120);
    const intro = String(body.intro ?? "").trim().slice(0, 1000);
    const dateLine = String(body.dateLine ?? "").trim().slice(0, 100);
    if (!subject || /[\r\n]/.test(subject) || !dateLine) return NextResponse.json({ error: "Enter a subject and date line." }, { status: 400 });
    const promotionEnabled = body.promotionEnabled === true;
    const percentOff = Number(body.percentOff);
    const code = normalizePromotionCode(body.code);
    if (promotionEnabled && (!Number.isInteger(percentOff) || percentOff < 1 || percentOff > 90 || code.length < 4)) {
      return NextResponse.json({ error: "Enter a code of at least 4 characters and a discount from 1–90%." }, { status: 400 });
    }
    const validEmail = (value: unknown): value is string => typeof value === "string" && value.length <= 254 && /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(value);
    const testEmail = String(body.testEmail || "zakeryshelley1997@gmail.com").trim().toLowerCase();
    if (test && !validEmail(testEmail)) return NextResponse.json({ error: "Enter one valid test email address." }, { status: 400 });
    if (!test && (!Array.isArray(body.emails) || body.emails.length < 1 || body.emails.length > 200)) {
      return NextResponse.json({ error: "Choose 1–200 subscribers per send." }, { status: 400 });
    }
    try {
      const { items } = await loadPublicEmailProducts(itemIds);
      if (items.length !== itemIds.length) return NextResponse.json({ error: "Some selected items are no longer available. Refresh the list and choose again." }, { status: 400 });
      const orderedItems = itemIds.map((id) => items.find((item) => String(item.id) === id)!).map((item) => ({ ...item, size: productSizeLabel(item) }));
      const requestedEmails = test ? [testEmail] : [...new Set<string>(body.emails.filter(validEmail).map((email: string) => email.trim().toLowerCase()))];
      let recipients = requestedEmails;
      if (!test) {
        if (!requestedEmails.length) return NextResponse.json({ error: "No selected addresses are subscribed." }, { status: 400 });
        const { data, error } = await supabase.from("subscribers").select("email").in("email", requestedEmails).is("unsubscribed_at", null).limit(200);
        if (error) throw error;
        recipients = (data ?? []).map((subscriber) => subscriber.email);
        if (!recipients.length) return NextResponse.json({ error: "No selected addresses are subscribed." }, { status: 400 });
      }
      const { gmailUser, transporter } = await mailer();
      // A test previews the offer; only a confirmed subscriber send activates it.
      if (promotionEnabled && !test) {
        const { error } = await supabase.from("promotion_codes").upsert({ code, percent_off: percentOff, description: "Drop email promotion", active: true, starts_at: new Date().toISOString(), expires_at: null, max_redemptions: null, updated_at: new Date().toISOString() }, { onConflict: "code" });
        if (error) throw error;
        await supabase.from("admin_audit_log").insert({ action: "promotion.saved", target_type: "promotion", target_id: code, details: { percent_off: percentOff } });
      }
      let sentCount = 0;
      let failedCount = 0;
      for (const email of recipients) {
        try {
          const unsubscribeUrl = `https://stackedracksvintage.co.uk/unsubscribe?token=${subscriberToken(email)}`;
          await transporter.sendMail({ from: `"Stacked Racks Vintage" <${gmailUser}>`, to: { address: email, name: "" }, subject: test ? `[TEST] ${subject}` : subject, html: dropEmailHtml({ items: orderedItems, intro, dateLine, promotion: { enabled: promotionEnabled, percentOff, code }, unsubscribeUrl }) });
          sentCount += 1;
        } catch (error) {
          failedCount += 1;
          console.error("Drop email failed:", error);
        }
      }
      if (!test) {
        const { data: campaign } = await supabase.from("email_campaigns").insert({ subject, preview_text: intro.slice(0, 160), body: JSON.stringify({ intro, dateLine, itemIds }), promotion_code: promotionEnabled ? code : null, status: failedCount ? "failed" : "sent", sent_count: sentCount, failed_count: failedCount, sent_at: new Date().toISOString() }).select("*").single();
        await supabase.from("admin_audit_log").insert({ action: "campaign.sent", target_type: "email_campaign", target_id: campaign?.id ?? "", details: { sent_count: sentCount, failed_count: failedCount, item_ids: itemIds } });
      }
      return NextResponse.json({ ok: failedCount === 0, sentCount, failedCount, skippedCount: test ? 0 : body.emails.length - recipients.length, ...(test && sentCount ? { sentTo: testEmail } : {}) });
    } catch (error) {
      console.error("Drop send failed:", error);
      return NextResponse.json({ error: "Could not prepare the drop email. Check the email configuration and try again." }, { status: 500 });
    }
  }

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

  let selectedItems: { id: string | number; name: string; size: string; price: number; imageUrls?: string[] }[] = [];
  if (action === "send-test" || action === "send") {
    if (body.itemIds !== undefined && (!Array.isArray(body.itemIds) || body.itemIds.length > 12 || !body.itemIds.every(validDropItemId))) {
      return NextResponse.json({ error: "Choose up to 12 valid items." }, { status: 400 });
    }
    const itemIds = [...new Set<string>((body.itemIds ?? []).map(String))];
    if (itemIds.length) {
      try {
        const { items } = await loadPublicEmailProducts(itemIds);
        if (items.length !== itemIds.length) return NextResponse.json({ error: "Some selected items are no longer available. Refresh the list and choose again." }, { status: 400 });
        selectedItems = itemIds.map((id) => items.find((item) => String(item.id) === id)!).map((item) => ({ ...item, size: productSizeLabel(item) }));
      } catch (error) {
        console.error("Campaign items load failed:", error);
        return NextResponse.json({ error: "Could not load selected items." }, { status: 500 });
      }
    }
  }

  if (action === "send-test") {
    const { gmailUser, transporter } = await mailer();
    const recipient = String(body.testEmail || process.env.OWNER_EMAIL || gmailUser).trim();
    const unsubscribeUrl = `https://stackedracksvintage.co.uk/unsubscribe?token=${subscriberToken(recipient.toLowerCase())}`;
    await transporter.sendMail({ from: `"Stacked Racks Vintage" <${gmailUser}>`, to: recipient, subject: `[TEST] ${subject}`, html: campaignHtml(emailBody, previewText, unsubscribeUrl, selectedItems) });
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
        await transporter.sendMail({ from: `"Stacked Racks Vintage" <${gmailUser}>`, to: subscriber.email, subject, html: campaignHtml(emailBody, previewText, unsubscribeUrl, selectedItems) });
        sentCount += 1;
      } catch (error) {
        failedCount += 1;
        console.error("Campaign email failed:", error);
      }
    }
    const { data: campaign } = await supabase.from("email_campaigns").insert({ subject, preview_text: previewText, body: emailBody, keywords: String(body.keywords ?? "").slice(0, 500), promotion_code: normalizePromotionCode(body.promotionCode) || null, status: failedCount ? "failed" : "sent", sent_count: sentCount, failed_count: failedCount, sent_at: new Date().toISOString() }).select("*").single();
    await supabase.from("admin_audit_log").insert({ action: "campaign.sent", target_type: "email_campaign", target_id: campaign?.id ?? "", details: { sent_count: sentCount, failed_count: failedCount, item_ids: selectedItems.map((item) => item.id) } });
    return NextResponse.json({ ok: failedCount === 0, sentCount, failedCount });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
