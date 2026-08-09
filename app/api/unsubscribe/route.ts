import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { emailFromSubscriberToken } from "@/lib/server/subscriber-token";
import { sameOrigin } from "@/lib/server/request-security";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  const { token } = await req.json().catch(() => ({ token: "" }));
  const email = emailFromSubscriberToken(String(token ?? ""));
  if (!email) return NextResponse.json({ error: "This unsubscribe link is invalid" }, { status: 400 });
  const { error } = await getSupabaseAdmin()
    .from("subscribers")
    .update({ unsubscribed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("email", email);
  if (error) return NextResponse.json({ error: "Could not update your preference" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
