const ITEMS = [
  "NEW PIECES ADDED WEEKLY",
  "FREE UK SHIPPING OVER £50",
  "5,000+ SALES",
  "2,500+ VINTED REVIEWS · 4.8★",
  "LONDON-BASED",
];

function MarqueeRow() {
  return (
    <>
      {ITEMS.map((item) => (
        <span key={item} className="inline-flex items-center">
          <span className="font-display text-[#0a0a0a] text-[20px] sm:text-[22px] font-extrabold tracking-[0.06em] uppercase">
            {item}
          </span>
          <span aria-hidden="true" className="mx-6 sm:mx-7 h-[9px] w-[9px] rotate-45 bg-[#0a0a0a]" />
        </span>
      ))}
    </>
  );
}

export default function MarqueeBanner() {
  return (
    <div className="bg-[#F5C300] border-b border-[#0a0a0a] overflow-hidden py-2 select-none">
      <div className="animate-info-ticker flex w-max whitespace-nowrap shrink-0">
        <MarqueeRow />
        <span aria-hidden="true" className="contents"><MarqueeRow /></span>
      </div>
    </div>
  );
}
