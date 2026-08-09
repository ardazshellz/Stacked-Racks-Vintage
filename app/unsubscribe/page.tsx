import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import UnsubscribeForm from "@/components/UnsubscribeForm";

export const metadata: Metadata = { title: "Email preferences", robots: { index: false, follow: false } };

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <main className="min-h-screen bg-[#0a0a0a] flex flex-col"><Navbar /><div className="mt-[92px] flex-1 max-w-xl w-full mx-auto px-4 py-16"><p className="text-[#E8500A] text-xs font-black uppercase tracking-widest mb-3">Email preferences</p><h1 className="text-3xl font-black mb-5">Unsubscribe</h1><UnsubscribeForm token={token} /></div><Footer /></main>;
}
