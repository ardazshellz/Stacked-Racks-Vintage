"use client";

const filters = [
  "All",
  "Jackets",
  "Hoodies",
  "T-Shirts",
  "Jerseys",
  "Knitwear",
  "Hats",
];

interface Props {
  active: string;
  onChange: (filter: string) => void;
}

export default function FilterBar({ active, onChange }: Props) {
  return (
    <div className="bg-[#0a0a0a] py-4 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => onChange(filter)}
              className={`flex-shrink-0 px-4 py-1.5 text-[10px] sm:text-xs font-black tracking-[0.15em] uppercase border transition-all duration-200 rounded-sm ${
                active === filter
                  ? "bg-[#E8500A] border-[#E8500A] text-white shadow-[0_0_16px_rgba(232,80,10,0.4)]"
                  : "border-white/15 text-[#aaa] hover:border-white/40 hover:text-white bg-transparent"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
