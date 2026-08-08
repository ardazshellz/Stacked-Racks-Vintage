import { isNew, type Product } from "@/lib/products";

const boxes = [
  { id: "new-in",  label: "New In",  sub: "Latest 14-day drops", href: "/shop?new=true",     image: "/section-new-in.jpg"  },
  { id: "mens",    label: "Mens",    sub: "All menswear",       href: "/shop?gender=Mens",  image: "/section-mens.jpg"    },
  { id: "womens",  label: "Womens",  sub: "All womenswear",     href: "/shop?gender=Womens",image: "/section-womens.jpg"  },
  { id: "marquee", label: "Marquee", sub: "Featured standout pieces", href: "/shop?rare=true",image: "/section-marquee.jpg" },
] as const;

export default function SectionBoxes({ products }: { products: Product[] }) {
  const availableBoxes = boxes.filter((box) => {
    if (box.id === "new-in") return products.some((product) => product.stock > 0 && isNew(product));
    if (box.id === "mens") return products.some((product) => product.stock > 0 && product.gender === "Mens");
    if (box.id === "womens") return products.some((product) => product.stock > 0 && product.gender === "Womens");
    return products.some((product) => product.stock > 0 && product.badge === "RARE");
  });

  if (!availableBoxes.length) return null;

  return (
    <section className="bg-[#0a0a0a] border-b border-white/5 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <p className="text-[#333] text-[10px] font-black tracking-[0.3em] uppercase mb-8 text-center">
          Shop by section
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {availableBoxes.map((box) => (
            <a
              key={box.id}
              href={box.href}
              className="group relative overflow-hidden flex flex-col border border-white/8 hover:border-[#E8500A]/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(232,80,10,0.15)]"
              style={{
                height: "180px",
                backgroundImage: box.image ? `url(${box.image})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "top center",
                backgroundColor: "#111",
              }}
            >
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/10" />

              {/* Orange top bar */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#E8500A] opacity-40 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Content */}
              <div className="relative z-10 flex flex-col h-full p-4 sm:p-5">
                <div className="mt-auto">
                  <h3
                    className="text-white text-base sm:text-lg font-black tracking-wider mb-0.5 group-hover:text-[#E8500A] transition-colors duration-200"
                    style={{ fontFamily: "var(--font-playfair-display), serif" }}
                  >
                    {box.label}
                  </h3>
                  <p className="text-white/70 text-[11px] tracking-wide uppercase transition-colors duration-200">
                    {box.sub}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2.5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                    <span className="text-[#E8500A] text-[11px] font-black tracking-[0.2em] uppercase">Browse</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-2.5 h-2.5 text-[#E8500A]">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
