import { FREE_SHIPPING_THRESHOLD } from "@/lib/shipping";

export default function FreeShippingBar({ subtotal }: { subtotal: number }) {
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const percent = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));
  return <div>
    <p className={`mb-2 text-sm font-semibold ${remaining === 0 ? "text-emerald-300" : "text-[#F5C300]"}`}>{remaining === 0 ? "You've unlocked free UK delivery" : `Add £${remaining.toFixed(2)} more for free UK delivery`}</p>
    <div className="h-3 w-full border border-white/15 bg-[#1a1a1a]" role="progressbar" aria-valuemin={0} aria-valuemax={FREE_SHIPPING_THRESHOLD} aria-valuenow={Math.min(subtotal, FREE_SHIPPING_THRESHOLD)} aria-label="Progress towards free UK delivery">
      <div className="h-full bg-[#E8500A] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
    </div>
    <p className="mt-1.5 flex justify-between text-xs text-[#a39b90]"><span>£0</span><span>Free over £{FREE_SHIPPING_THRESHOLD}</span></p>
  </div>;
}
