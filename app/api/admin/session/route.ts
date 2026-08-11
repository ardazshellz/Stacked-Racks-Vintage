import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_SECONDS,
  isAdminConfigured,
  isAdminRequest,
  makeAdminSession,
  verifyAdminPassword,
} from "@/lib/server/admin-auth";
import { sameOrigin, withinRateLimit } from "@/lib/server/request-security";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export async function GET() {
  return NextResponse.json({
    authenticated: await isAdminRequest(),
    configured: isAdminConfigured(),
  });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  if (!(await withinRateLimit(req, "admin-login", 8, 15 * 60))) {
    return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }
  const { password } = (await req.json()) as { password?: string };
  if (!verifyAdminPassword(password ?? "")) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const response = NextResponse.json({ authenticated: true });
  await getSupabaseAdmin().from("admin_audit_log").insert({ action: "admin.login", target_type: "session", target_id: "admin" });
  response.cookies.set(ADMIN_COOKIE, makeAdminSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_SESSION_SECONDS,
  });
  response.cookies.set("sr_analytics_exclude", "1", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}
