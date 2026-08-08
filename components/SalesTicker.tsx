"use client";

const TEXT = "SIGN UP WITH YOUR EMAIL FOR 10% OFF";
const SEP  = "      ✦      ";
// Four repetitions per copy so the copy is always wider than the viewport
const COPY = `${TEXT}${SEP}${TEXT}${SEP}${TEXT}${SEP}${TEXT}${SEP}`;

function openEmailPopup() {
  document.dispatchEvent(new CustomEvent("sr:open-email-popup"));
}

export default function SalesTicker() {
  return (
    <div
      className="fixed top-0 left-0 right-0 h-7 bg-[#E8500A] overflow-hidden z-[70] flex items-center select-none cursor-pointer"
      onClick={openEmailPopup}
      title="Sign up for 10% off"
      role="button"
      aria-label="Sign up for 10% off"
    >
      <div
        className="flex whitespace-nowrap shrink-0 text-[10px] text-white font-black tracking-[0.3em] pointer-events-none"
        style={{
          animation: "marquee-scroll 90s linear infinite",
          willChange: "transform",
          backfaceVisibility: "hidden",
        }}
      >
        <span>{COPY}</span>
        <span>{COPY}</span>
      </div>
    </div>
  );
}
