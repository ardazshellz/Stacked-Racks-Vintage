"use client";

import { useState } from "react";
import SizeGuide from "@/components/SizeGuide";

export default function SizeGuideLink() {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" onClick={() => setOpen(true)} className="min-h-12 text-[#aaa] underline underline-offset-4 hover:text-white text-sm">Size guide</button>
    {open && <SizeGuide onClose={() => setOpen(false)} />}
  </>;
}
