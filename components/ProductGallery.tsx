"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { trackFirstParty } from "@/lib/first-party-analytics";
import { trackMetaEvent } from "@/lib/meta-pixel";

export default function ProductGallery({ images, name, productId, price }: { images: string[]; name: string; productId: string; price: number }) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    trackEvent("view_item", { item_id: productId, item_name: name, value: price, currency: "GBP" });
    trackFirstParty("product_view", { productId, productName: name });
    trackMetaEvent("ViewContent", { content_ids: [productId], content_name: name, content_type: "product", value: price, currency: "GBP" });
  }, [name, price, productId]);

  if (!images.length) {
    return <div className="w-full min-w-0 max-w-full aspect-[3/4] bg-[#151515] border border-white/10 flex items-center justify-center text-[#999]">Photo coming soon</div>;
  }

  const thumbs = images.length > 1 && <div className="flex min-w-0 gap-2.5 overflow-x-auto pb-1 max-lg:order-2 lg:flex-col lg:overflow-visible" aria-label="Product photos">
    {images.map((image, index) => <button type="button" key={`${image}-${index}`} onClick={() => setActive(index)} className={`relative aspect-[3/4] w-16 shrink-0 border-2 lg:w-[76px] ${index === active ? "border-[#E8500A]" : "border-white/15 hover:border-white/40"}`} aria-label={`Show photo ${index + 1} of ${images.length}`} aria-current={index === active}><Image src={image} alt="" fill sizes="76px" loading="eager" className="object-cover" /></button>)}
  </div>;

  return (
    <div className="grid w-full min-w-0 max-w-full gap-3 lg:grid-cols-[76px_minmax(0,1fr)] lg:gap-3">
      {thumbs}
      <button type="button" onClick={() => setZoomed(true)} className="relative block w-full min-w-0 max-w-full aspect-[3/4] bg-[#111] border border-white/10 max-lg:order-1 lg:col-start-2 lg:row-start-1" aria-label="Enlarge product photo">
        <Image src={images[active]} alt={`${name} — photo ${active + 1}`} fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain" />
        <span className="absolute bottom-3 right-3 bg-black/80 text-white text-xs px-2 py-1">{active + 1}/{images.length}</span>
      </button>
      {zoomed && <div className="fixed inset-0 z-[300] bg-black/95 p-4 sm:p-10 flex items-center justify-center" role="dialog" aria-label="Enlarged product photo" onClick={() => setZoomed(false)}><div className="relative w-full h-full"><Image src={images[active]} alt={`${name} enlarged`} fill sizes="100vw" className="object-contain" /></div><button type="button" onClick={() => setZoomed(false)} className="absolute top-4 right-4 w-11 h-11 bg-white text-black text-xl" aria-label="Close enlarged photo">×</button></div>}
    </div>
  );
}
