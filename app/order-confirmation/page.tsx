import type { Metadata } from "next";
import Link from "next/link";
import Stripe from "stripe";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import OrderConfirmationClient from "@/components/OrderConfirmationClient";
import { getPublicProducts } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order confirmation", robots: { index: false, follow: false } };

export default async function OrderConfirmationPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const products = await getPublicProducts().catch(() => []);
  let paid = false;
  let total = 0;
  let itemNames: string[] = [];
  let orderId = "";

  if (sessionId && stripeKey) {
    try {
      const session = await new Stripe(stripeKey).checkout.sessions.retrieve(sessionId);
      paid = session.payment_status === "paid";
      total = Number(session.amount_total ?? 0) / 100;
      orderId = `SR-${session.id.slice(-12).toUpperCase()}`;
      itemNames = JSON.parse(session.metadata?.item_names ?? "[]");
      if (!Array.isArray(itemNames)) itemNames = [];
    } catch (error) {
      console.error("Order confirmation lookup failed:", error);
    }
  }

  return <main className="min-h-screen bg-[#0a0a0a] flex flex-col">
    <Navbar products={products} />
    <div className="mt-[92px] flex-1 flex items-center justify-center px-4 py-12">
      <section className="w-full max-w-xl bg-[#111] border border-white/10 p-6 sm:p-9 text-center">
        {paid ? <>
          <OrderConfirmationClient orderId={orderId} total={total} itemCount={itemNames.length} />
          <div className="w-16 h-16 mx-auto mb-6 border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 flex items-center justify-center text-3xl">✓</div>
          <p className="text-emerald-300 text-xs font-black tracking-[0.2em] uppercase mb-3">Payment successful</p>
          <h1 className="text-3xl font-black mb-3" style={{ fontFamily: "var(--font-playfair-display), serif" }}>Your order is confirmed</h1>
          <p className="text-[#bbb] text-sm mb-6">A confirmation email is on its way. We aim to dispatch within 24–48 hours.</p>
          {itemNames.length > 0 && <div className="text-left border-y border-white/10 py-4 mb-5 space-y-2">{itemNames.map((name) => <p key={name} className="text-sm text-white">{name}</p>)}</div>}
          <div className="flex justify-between text-sm mb-2"><span className="text-[#999]">Order number</span><span className="font-bold">{orderId}</span></div>
          <div className="flex justify-between text-sm mb-7"><span className="text-[#999]">Total paid</span><span className="text-[#E8500A] font-black">£{total.toFixed(2)}</span></div>
          <div className="grid sm:grid-cols-2 gap-3"><Link href="/shop" className="min-h-12 bg-[#E8500A] text-white flex items-center justify-center font-black text-xs uppercase tracking-[0.18em]">Continue shopping</Link><Link href="/order-status" className="min-h-12 border border-white/20 text-white flex items-center justify-center font-black text-xs uppercase tracking-[0.16em]">Track order</Link></div>
        </> : <>
          <h1 className="text-2xl font-black mb-3">We could not confirm this order</h1>
          <p className="text-[#bbb] text-sm mb-7">If money has left your account, do not pay again. Email us and include your Stripe receipt.</p>
          <div className="grid sm:grid-cols-2 gap-3"><Link href="/shop" className="min-h-12 border border-white/20 flex items-center justify-center text-xs font-bold uppercase">Return to shop</Link><a href="mailto:stackedracksvintage@gmail.com" className="min-h-12 bg-[#E8500A] flex items-center justify-center text-xs font-bold uppercase">Contact us</a></div>
        </>}
      </section>
    </div>
    <Footer />
  </main>;
}
