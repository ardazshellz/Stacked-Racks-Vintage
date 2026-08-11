"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { trackFirstParty } from "@/lib/first-party-analytics";

export default function ProductGallery({ images, name, productId, price }: { images: string[]; name: string; productId: string; price: number }) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    trackEvent("view_item", { item_id: productId, item_name: name, value: price, currency: "GBP" });
    trackFirstParty("product_view", { productId, productName: name });
  }, [name, price, productId]);

  if (!images.length) {
    return <div className="w-full min-w-0 max-w-full aspect-[3/4] bg-[#151515] border border-white/10 flex items-center justify-center text-[#999]">Photo coming soon</div>;
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden">
      <button type="button" onClick={() => setZoomed(true)} className="relative block w-full min-w-0 max-w-full aspect-[3/4] bg-[#111] border border-white/10" aria-label="Enlarge product photo">
        <Image src={images[active]} alt={`${name} — photo ${active + 1}`} fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain" />
        <span className="absolute bottom-3 right-3 bg-black/80 text-white text-xs px-2 py-1">{active + 1}/{images.length}</span>
      </button>
      {images.length > 1 && <div className="mt-3 flex w-full min-w-0 max-w-full gap-2 overflow-x-auto pb-1" aria-label="Product photos">
        {images.map((image, index) => <button type="button" key={`${image}-${index}`} onClick={() => setActive(index)} className={`relative w-16 h-20 shrink-0 border ${index === active ? "border-[#E8500A]" : "border-white/15"}`} aria-label={`Show product photo ${index + 1}`}><Image src={image} alt="" fill sizes="64px" className="object-cover" /></button>)}
      </div>}
      {zoomed && <div className="fixed inset-0 z-[300] bg-black/95 p-4 sm:p-10 flex items-center justify-center" role="dialog" aria-label="Enlarged product photo" onClick={() => setZoomed(false)}><div className="relative w-full h-full"><Image src={images[active]} alt={`${name} enlarged`} fill sizes="100vw" className="object-contain" /></div><button type="button" onClick={() => setZoomed(false)} className="absolute top-4 right-4 w-11 h-11 bg-white text-black text-xl" aria-label="Close enlarged photo">×</button></div>}
    </div>
  );
}
