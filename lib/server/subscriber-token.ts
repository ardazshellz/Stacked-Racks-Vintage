import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

function secret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function subscriberToken(email: string) {
  const normalized = email.trim().toLowerCase();
  const signature = createHmac("sha256", secret()).update(normalized).digest("hex");
  return Buffer.from(`${normalized}.${signature}`).toString("base64url");
}

export function emailFromSubscriberToken(token: string) {
  try {
    const value = Buffer.from(token, "base64url").toString("utf8");
    const splitAt = value.lastIndexOf(".");
    if (splitAt < 1) return null;
    const email = value.slice(0, splitAt);
    const supplied = Buffer.from(value.slice(splitAt + 1));
    const expected = Buffer.from(createHmac("sha256", secret()).update(email).digest("hex"));
    return supplied.length === expected.length && timingSafeEqual(supplied, expected) ? email : null;
  } catch {
    return null;
  }
}
