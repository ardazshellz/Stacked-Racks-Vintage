import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "sr_admin_session";
export const ADMIN_SESSION_SECONDS = 60 * 60 * 8;

function adminPassword() {
  return process.env.ADMIN_PASSWORD?.trim() ?? "";
}

function signingSecret() {
  return process.env.ADMIN_SESSION_SECRET?.trim() || `${adminPassword()}:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`;
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function signature(expires: string) {
  return createHmac("sha256", signingSecret()).update(expires).digest("hex");
}

export function isAdminConfigured() {
  return adminPassword().length >= 12;
}

export function verifyAdminPassword(candidate: string) {
  return isAdminConfigured() && safeEqual(candidate, adminPassword());
}

export function makeAdminSession() {
  const expires = String(Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS);
  return `${expires}.${signature(expires)}`;
}

export async function isAdminRequest() {
  if (!isAdminConfigured()) return false;
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const [expires, supplied] = token.split(".");
  if (!expires || !supplied || Number(expires) <= Math.floor(Date.now() / 1000)) return false;
  return safeEqual(supplied, signature(expires));
}
