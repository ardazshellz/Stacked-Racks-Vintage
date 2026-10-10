import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { dropEmailHtml } from "@/lib/email-html";
import { dropEmailsByDay, dropsToEmail } from "@/lib/listing-schedule";
import { productSizeLabel } from "@/lib/products";
import { loadPublicEmailProducts } from "@/lib/server/email-products";
import { getProductSettings, saveProductSettings } from "@/lib/server/product-settings";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { subscriberToken } from "@/lib/server/subscriber-token";

export const runtime = "nodejs";
export const maxDuration = 60;

function validSecret(req: Request) {
  const configured = process.env.CRON_SECRET ?? "";
  const supplied = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const left = Buffer.from(configured);
  const right = Buffer.from(supplied);
  return configured.length >= 32 && left.length === right.length && timingSafeEqual(left, right);
}

// Sends the "new drop" email to every subscribed address once a scheduled drop has gone live.
// Runs from Vercel cron (see vercel.json), so it needs no admin sign-in and no browser.
export async function GET(req: Request) {
  if (!validSecret(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const gmailUser = process.env.GMAIL_USER ?? "stackedracksvintage@gmail.com";
  if (!gmailPass || gmailPass.length < 12) return NextResponse.json({ error: "Gmail SMTP is not configured" }, { status: 500 });
  try {
    const supabase = getSupabaseAdmin();
    const settings = await getProductSettings();
    const due = dropsToEmail(settings);
    if (!due.length) return NextResponse.json({ ok: true, drops: [] });

    // Mark the drops as emailed BEFORE sending: if this run dies half-way, a subscriber misses one
    // email rather than getting the same one twice on the next run.
    await saveProductSettings({ ...settings, emailedDrops: [...settings.emailedDrops, ...due.map((drop) => drop.at)] });

    const { data: subscribers, error } = await supabase.from("subscribers").select("email").is("unsubscribed_at", null).limit(200);
    if (error) throw error;
    const recipients = (subscribers ?? []).map((subscriber) => String(subscriber.email));
    const transporter = nodemailer.createTransport({ host: "smtp.gmail.com", port: 587, secure: false, auth: { user: gmailUser, pass: gmailPass } });
    const results = [];
    for (const drop of dropEmailsByDay(due)) {
      // Only items that are public and in stock right now; anything sold or hidden since is left out.
      const { items } = await loadPublicEmailProducts(drop.ids);
      const ordered = drop.ids.map((id) => items.find((item) => String(item.id) === id)).filter((item) => item !== undefined).map((item) => ({ ...item, size: productSizeLabel(item) }));
      if (!ordered.length || !recipients.length) { results.push({ day: drop.day, items: ordered.length, sent: 0, failed: 0 }); continue; }
      const dateLine = new Date(drop.ats[0]).toLocaleDateString("en-GB", { timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long" });
      const subject = `New drop: ${ordered.length} one-off vintage ${ordered.length === 1 ? "piece" : "pieces"}`;
      let sent = 0;
      let failed = 0;
      for (const email of recipients) {
        try {
          const unsubscribeUrl = `https://stackedracksvintage.co.uk/unsubscribe?token=${subscriberToken(email)}`;
          await transporter.sendMail({ from: `"Stacked Racks Vintage" <${gmailUser}>`, to: { address: email, name: "" }, subject, html: dropEmailHtml({ items: ordered, intro: "", dateLine, promotion: { enabled: false, percentOff: 0, code: "" }, unsubscribeUrl }) });
          sent += 1;
        } catch (mailError) {
          failed += 1;
          console.error("Automatic drop email failed:", mailError);
        }
      }
      const { data: campaign } = await supabase.from("email_campaigns").insert({ subject, preview_text: "", body: JSON.stringify({ intro: "", dateLine, itemIds: ordered.map((item) => String(item.id)), automatic: true }), promotion_code: null, status: failed ? "failed" : "sent", sent_count: sent, failed_count: failed, sent_at: new Date().toISOString() }).select("id").single();
      await supabase.from("admin_audit_log").insert({ action: "campaign.sent_automatically", target_type: "email_campaign", target_id: campaign?.id ?? "", details: { drop: drop.day, releases: drop.ats, sent_count: sent, failed_count: failed, item_ids: ordered.map((item) => String(item.id)) } });
      results.push({ day: drop.day, items: ordered.length, sent, failed });
    }
    return NextResponse.json({ ok: results.every((result) => !result.failed), drops: results });
  } catch (error) {
    console.error("Automatic drop email run failed:", error);
    return NextResponse.json({ error: "Drop email run failed" }, { status: 500 });
  }
}
