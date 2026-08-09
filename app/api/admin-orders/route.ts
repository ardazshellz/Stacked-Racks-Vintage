import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import nodemailer from "nodemailer";
import { sameOrigin } from "@/lib/server/request-security";

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await getSupabaseAdmin()
    .from("orders")
    .select("*")
    .order("date_of_sale", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ orders: data });
}

export async function POST(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  const body = (await req.json()) as Record<string, unknown>;
  if (!body.item_name || !body.customer_name || Number(body.total) <= 0) {
    return NextResponse.json({ error: "Customer, item and total are required" }, { status: 400 });
  }
  const row = {
    id: `SR-${Date.now().toString(36).toUpperCase()}`,
    source: "manual",
    item_name: String(body.item_name),
    brand: String(body.brand ?? ""),
    price: Number(body.price ?? body.total),
    postage: Number(body.postage ?? 0),
    total: Number(body.total),
    customer_name: String(body.customer_name),
    customer_email: String(body.customer_email ?? ""),
    customer_phone: String(body.customer_phone ?? ""),
    customer_address: String(body.customer_address ?? ""),
    payment_status: String(body.payment_status ?? "paid").toLowerCase(),
    notes: String(body.notes ?? ""),
    date_of_sale: String(body.date_of_sale ?? new Date().toISOString()),
  };
  const { data, error } = await getSupabaseAdmin().from("orders").insert(row).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ order: data }, { status: 201 });
}

export async function PATCH(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  const body = (await req.json()) as { id?: string; payment_status?: string; fulfilment_status?: string; tracking_number?: string; notes?: string };
  if (!body.id) return NextResponse.json({ error: "Missing order id" }, { status: 400 });
  const allowedStatuses = new Set(["paid", "packing", "dispatched", "delivered", "returned", "refunded"]);
  const changes: Record<string, string | boolean> = { updated_at: new Date().toISOString() };
  if (body.payment_status) changes.payment_status = body.payment_status.toLowerCase();
  if (body.fulfilment_status && allowedStatuses.has(body.fulfilment_status)) changes.fulfilment_status = body.fulfilment_status;
  if (typeof body.tracking_number === "string") changes.tracking_number = body.tracking_number.trim().slice(0, 100);
  if (typeof body.notes === "string") changes.notes = body.notes;
  if (body.fulfilment_status === "dispatched") changes.dispatched_at = new Date().toISOString();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("orders").update(changes).eq("id", body.id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from("admin_audit_log").insert({ action: "order.updated", target_type: "order", target_id: body.id, details: changes });

  if (body.fulfilment_status === "dispatched" && data.customer_email && !data.dispatch_email_sent) {
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    const gmailUser = process.env.GMAIL_USER ?? "stackedracksvintage@gmail.com";
    if (gmailPass) {
      const tracking = String(data.tracking_number ?? "");
      const trackingUrl = tracking ? `https://www.royalmail.com/track-your-item#/tracking-results/${encodeURIComponent(tracking)}` : "";
      try {
        const transporter = nodemailer.createTransport({ host: "smtp.gmail.com", port: 587, secure: false, auth: { user: gmailUser, pass: gmailPass } });
        await transporter.sendMail({
          from: `"Stacked Racks Vintage" <${gmailUser}>`,
          to: data.customer_email,
          subject: `Your order ${data.id} has been dispatched`,
          html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;background:#0a0a0a;color:#fff;padding:32px"><h1 style="color:#E8500A">Your order is on its way</h1><p>Hi ${escapeHtml(data.customer_name)}, we have dispatched ${escapeHtml(data.item_name)}.</p>${tracking ? `<p><strong>Royal Mail tracking:</strong> ${escapeHtml(tracking)}</p><p><a style="color:#F5C300" href="${trackingUrl}">Track your parcel →</a></p>` : ""}<p style="color:#777;font-size:12px">Order ${escapeHtml(data.id)}</p></div>`,
        });
        await supabase.from("orders").update({ dispatch_email_sent: true }).eq("id", body.id);
      } catch (mailError) {
        console.error("Dispatch email failed:", mailError);
      }
    }
  }
  return NextResponse.json({ order: data });
}
