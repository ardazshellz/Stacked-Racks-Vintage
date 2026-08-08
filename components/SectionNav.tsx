"use client";

const sections = [
  { id: "new-in", label: "New In" },
  { id: "rare", label: "Rare" },
  { id: "one-of-one", label: "1 of 1" },
  { id: "marquee", label: "Marquee" },
];

interface Props {
  active: string;
  onChange: (section: string) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

export default function SectionNav({ active, onChange, searchQuery = "", onSearchChange }: Props) {
  return (
    <div
      id="shop"
      className="sticky top-[92px] z-40 bg-[#0a0a0a]/98 backdrop-blur-sm border-b border-white/10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          {/* Section tabs */}
          <div className="flex overflow-x-auto scrollbar-none flex-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => onChange(section.id)}
                className={`px-5 sm:px-7 py-4 text-xs sm:text-sm font-black tracking-[0.15em] uppercase whitespace-nowrap border-b-2 transition-all duration-200 ${
                  active === section.id
                    ? "border-[#E8500A] text-[#E8500A]"
                    : "border-transparent text-[#aaa] hover:text-white hover:border-white/20"
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>

          {/* Search */}
          {onSearchChange && (
            <div className="hidden sm:flex items-center gap-2 shrink-0 py-2">
              <div className="relative">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555] pointer-events-none">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search brand, name..."
                  className="bg-[#111] border border-white/10 text-white text-xs pl-8 pr-3 py-2 w-44 focus:outline-none focus:border-[#E8500A]/50 placeholder:text-[#444] transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#555] hover:text-white transition-colors"
                    aria-label="Clear search"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
