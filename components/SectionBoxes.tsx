const boxes = [
  { id: "new-in",  label: "New In",  sub: "Latest 14-day drops", href: "/shop?new=true",     image: "/section-new-in.jpg"  },
  { id: "mens",    label: "Mens",    sub: "All menswear",       href: "/shop?gender=Mens",  image: "/section-mens.jpg"    },
  { id: "womens",  label: "Womens",  sub: "All womenswear",     href: "/shop?gender=Womens",image: "/section-womens.jpg"  },
  { id: "marquee", label: "Marquee", sub: "Featured standout pieces", href: "/shop?rare=true",image: "/section-marquee.jpg" },
] as const;

export default function SectionBoxes() {
  return (
    <section className="bg-[#0a0a0a] border-b border-white/5 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <p className="text-[#333] text-[10px] font-black tracking-[0.3em] uppercase mb-8 text-center">
          Shop by section
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {boxes.map((box) => (
            <a
              key={box.id}
              href={box.href}
              className="relative overflow-hidden flex flex-col border border-[#252525]"
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

              {/* Content */}
              <div className="relative z-10 flex flex-col h-full p-4 sm:p-5">
                <div className="mt-auto">
                  <h3
                    className="text-white text-base sm:text-lg font-black tracking-wider mb-0.5"
                    style={{ fontFamily: "var(--font-playfair-display), serif" }}
                  >
                    {box.label}
                  </h3>
                  <p className="text-white/70 text-[11px] tracking-wide uppercase transition-colors duration-200">
                    {box.sub}
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
