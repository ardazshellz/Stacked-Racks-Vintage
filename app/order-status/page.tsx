import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import OrderStatusForm from "@/components/OrderStatusForm";

export const metadata: Metadata = { title: "Track Your Order", description: "Check the dispatch and tracking status of your Stacked Racks Vintage order.", robots: { index: false, follow: false } };

export default function OrderStatusPage() {
  return <div className="min-h-screen bg-[#0a0a0a]"><Navbar /><main className="max-w-xl mx-auto px-4 pt-40 pb-20"><p className="text-[#E8500A] text-[10px] font-black tracking-[0.3em] uppercase mb-3">Customer care</p><h1 className="text-3xl sm:text-4xl font-black mb-3" style={{ fontFamily: "var(--font-playfair-display), serif" }}>Track your order</h1><p className="text-[#aaa] text-sm leading-relaxed mb-7">Enter the order number from your confirmation email and the same email address used at checkout.</p><OrderStatusForm /></main><Footer /></div>;
}
