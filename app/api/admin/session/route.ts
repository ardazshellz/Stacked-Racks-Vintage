import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_SECONDS,
  isAdminConfigured,
  isAdminRequest,
  makeAdminSession,
  verifyAdminPassword,
} from "@/lib/server/admin-auth";

export async function GET() {
  return NextResponse.json({
    authenticated: await isAdminRequest(),
    configured: isAdminConfigured(),
  });
}

export async function POST(req: Request) {
  const { password } = (await req.json()) as { password?: string };
  if (!verifyAdminPassword(password ?? "")) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(ADMIN_COOKIE, makeAdminSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_SESSION_SECONDS,
  });
  return response;
}

export async function DELETE() {
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
