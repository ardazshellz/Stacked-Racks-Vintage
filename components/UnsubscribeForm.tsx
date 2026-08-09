"use client";

import { useState } from "react";

export default function UnsubscribeForm({ token }: { token: string }) {
  const [state, setState] = useState<"ready" | "loading" | "done" | "error">("ready");
  const unsubscribe = async () => {
    setState("loading");
    const response = await fetch("/api/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
    setState(response.ok ? "done" : "error");
  };
  if (state === "done") return <p className="text-emerald-300">You have been unsubscribed. You will not receive marketing emails from us.</p>;
  return <div><p className="text-[#bbb] mb-6">You can stop marketing emails from Stacked Racks Vintage at any time. Order emails will still be sent when you make a purchase.</p><button onClick={unsubscribe} disabled={state === "loading" || !token} className="min-h-12 bg-[#E8500A] disabled:opacity-40 px-6 font-black text-xs uppercase tracking-widest">{state === "loading" ? "Updating…" : "Unsubscribe"}</button>{state === "error" && <p className="text-red-300 text-sm mt-4">This link could not be processed. Email us and we will remove you manually.</p>}</div>;
}
