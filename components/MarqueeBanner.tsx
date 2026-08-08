const ITEMS = [
  "NEW IN THIS WEEK",
  "FREE UK SHIPPING OVER £50",
  "5,000+ SALES",
  "2,500+ 5 STAR REVIEWS",
  "LONDON BASED",
  "EST. LTD CO.",
];

function MarqueeRow() {
  return (
    <>
      {ITEMS.map((item) => (
        <span key={item} className="inline-flex items-center gap-8 mx-8">
          <span className="text-white/60 text-lg font-black">✦</span>
          <span className="text-white text-[13px] sm:text-sm font-black tracking-[0.25em] uppercase">
            {item}
          </span>
        </span>
      ))}
    </>
  );
}

export default function MarqueeBanner() {
  return (
    <div className="bg-[#E8500A] overflow-hidden py-3.5 select-none">
      <div style={{ animation: "marquee-scroll 50s linear infinite" }} className="flex whitespace-nowrap shrink-0">
        <MarqueeRow />
        <MarqueeRow />
      </div>
    </div>
  );
}
