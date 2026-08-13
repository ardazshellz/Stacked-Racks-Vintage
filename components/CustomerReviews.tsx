const REVIEWS = [
  {
    name: "georgielawrence",
    text: "Amazing, item just as described and fast delivery! Would definitely buy from here again!",
  },
  {
    name: "liamchatburn",
    text: "Really happy, delivered on time if not quicker and jacket was as advertised. Would buy from you again nice one!",
  },
  {
    name: "abi.a3693",
    text: "Great seller and quick delivery thanks 🤩",
  },
  {
    name: "bm_in_uk_off",
    text: "Perfect Transaction, serious seller 👌🏻",
  },
  {
    name: "bizzielizziewizzie",
    text: "Great jacket. Prompt posting. Thanks",
  },
  {
    name: "Verified buyer",
    text: "They responded to queries about the item really promptly, helping me decide if it was the right piece for me. When the jacket arrived it was as described.",
  },
] as const;

const VINTED_FEEDBACK_URL = "https://www.vinted.co.uk/member/59714764?tab=feedback";

export default function CustomerReviews() {
  return (
    <section aria-labelledby="customer-reviews-heading" className="border-t border-white/5 bg-[#080808] py-12 sm:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="px-4 sm:px-6 lg:px-8">
          <p className="mb-3 text-center text-[10px] font-black uppercase tracking-[0.3em] text-[#E8500A]">
            5-Star Vinted Feedback
          </p>
          <h2
            id="customer-reviews-heading"
            className="text-center text-2xl font-black tracking-wider text-white sm:text-3xl"
            style={{ fontFamily: "var(--font-playfair-display), serif" }}
          >
            What our customers say
          </h2>
          <p className="mt-3 text-center text-xs tracking-wide text-[#777] sm:text-sm">
            Swipe to read more verified buyer feedback
          </p>
        </div>

        <div
          className="scrollbar-none mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-3 sm:gap-4 sm:px-6 lg:px-8"
          aria-label="Customer reviews"
        >
          {REVIEWS.map((review) => (
            <article
              key={review.name}
              className="min-h-52 flex-none basis-[86%] snap-start border border-white/10 bg-[#111] p-5 sm:basis-[calc(50%_-_0.5rem)] sm:p-6 lg:basis-[calc(33.333%_-_0.75rem)]"
            >
              <div className="text-base tracking-[0.12em] text-[#F5C300]" aria-label="5 out of 5 stars">
                ★★★★★
              </div>
              <blockquote className="mt-5 text-sm leading-7 text-[#d0d0d0]">
                &ldquo;{review.text}&rdquo;
              </blockquote>
              <p className="mt-5 border-t border-white/8 pt-4 text-xs font-black tracking-[0.08em] text-white">
                {review.name}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-5 px-4 text-center sm:px-6 lg:px-8">
          <a
            href={VINTED_FEEDBACK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center border border-[#F5C300]/50 px-5 py-3 text-center text-[11px] font-black uppercase tracking-[0.15em] text-[#F5C300] transition-colors hover:bg-[#F5C300]/10"
          >
            See all 2,500+ reviews on Vinted
          </a>
        </div>
      </div>
    </section>
  );
}
