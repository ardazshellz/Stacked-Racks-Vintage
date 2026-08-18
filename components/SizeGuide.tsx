"use client";

import { useEffect } from "react";

interface Props {
  onClose: () => void;
}

const CHART = [
  { size: "XS",  chest_in: "33–34", chest_cm: "84–86",   waist_in: "27–28", waist_cm: "69–71" },
  { size: "S",   chest_in: "35–36", chest_cm: "89–91",   waist_in: "29–30", waist_cm: "74–76" },
  { size: "M",   chest_in: "37–38", chest_cm: "94–97",   waist_in: "31–32", waist_cm: "79–81" },
  { size: "L",   chest_in: "39–40", chest_cm: "99–102",  waist_in: "33–34", waist_cm: "84–86" },
  { size: "XL",  chest_in: "41–42", chest_cm: "104–107", waist_in: "35–36", waist_cm: "89–91" },
  { size: "XXL", chest_in: "43–44", chest_cm: "109–112", waist_in: "37–38", waist_cm: "94–97" },
];

export default function SizeGuide({ onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Size Guide"
    >
      <div className="bg-[#111] border border-white/10 w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h3
              className="text-white font-black text-sm tracking-widest uppercase"
              style={{ fontFamily: "var(--font-playfair-display), serif" }}
            >
              Size Guide
            </h3>
            <p className="text-[#555] text-[10px] mt-0.5 tracking-wide">Measurements are approximate</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#aaa] hover:text-white w-8 h-8 flex items-center justify-center hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/8">
                {["Fits", "Chest (in)", "Chest (cm)", "Waist (in)", "Waist (cm)"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[9px] font-black text-[#E8500A] uppercase tracking-[0.2em] whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CHART.map((row, i) => (
                <tr
                  key={row.size}
                  className={`border-b border-white/5 ${i % 2 === 0 ? "bg-white/[0.02]" : ""}`}
                >
                  <td className="px-4 py-3 text-white font-black tracking-wider">{row.size}</td>
                  <td className="px-4 py-3 text-[#aaa]">{row.chest_in}</td>
                  <td className="px-4 py-3 text-[#aaa]">{row.chest_cm}</td>
                  <td className="px-4 py-3 text-[#aaa]">{row.waist_in}</td>
                  <td className="px-4 py-3 text-[#aaa]">{row.waist_cm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Note */}
        <div className="px-5 py-4 border-t border-white/8">
          <p className="text-[#555] text-[10px] leading-relaxed">
            Vintage sizing runs smaller than modern cuts. When in doubt, size up.
            DM us on Instagram if you need help with fit.
          </p>
        </div>
      </div>
    </div>
  );
}
