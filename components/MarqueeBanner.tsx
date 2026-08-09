const ITEMS = [
  "LATEST 14-DAY DROPS",
  "FREE UK SHIPPING OVER £50",
  "5,000+ SALES",
  "2,500+ FIVE-STAR REVIEWS",
  "LONDON-BASED",
  "LONDON-BASED LTD",
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
      <div className="animate-info-ticker flex w-max whitespace-nowrap shrink-0">
        <MarqueeRow />
        <span aria-hidden="true" className="contents"><MarqueeRow /></span>
      </div>
    </div>
  );
}
