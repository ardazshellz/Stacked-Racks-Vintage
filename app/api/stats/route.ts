import { NextResponse } from "next/server";

// To enable live Instagram follower counts:
// 1. Set up a Facebook Developer App at developers.facebook.com
// 2. Get a long-lived Instagram Graph API token
// 3. Add INSTAGRAM_TOKEN and INSTAGRAM_USER_ID to your .env.local
// Until then, update MANUAL_FOLLOWERS below whenever you check.

const MANUAL_FOLLOWERS = 2469;
const MANUAL_SALES = 5000;

async function fetchInstagramFollowers(): Promise<number | null> {
  const token = process.env.INSTAGRAM_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;
  if (!token || !userId) return null;

  try {
    const res = await fetch(
      `https://graph.instagram.com/${userId}?fields=followers_count&access_token=${token}`,
      { next: { revalidate: 3600 } } // cache for 1 hour
    );
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.followers_count === "number" ? data.followers_count : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const liveFollowers = await fetchInstagramFollowers();
  return NextResponse.json({
    followers: liveFollowers ?? MANUAL_FOLLOWERS,
    sales: MANUAL_SALES,
    live: liveFollowers !== null,
  });
}
