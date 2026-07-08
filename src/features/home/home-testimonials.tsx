export type HomeTestimonialItem = {
  id: number;
  authorName: string;
  body: string;
  rating: number | null;
};

type HomeTestimonialsProps = {
  items: HomeTestimonialItem[];
};

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-amber-500" aria-label={`Оценка ${rating} из 5`}>
      {"★".repeat(rating)}
      <span className="text-zinc-200">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export function HomeTestimonials({ items }: HomeTestimonialsProps) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="home-testimonials-title" className="space-y-5">
      <h2 id="home-testimonials-title" className="text-2xl font-bold text-zinc-900 sm:text-3xl">
        Отзывы клиентов
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <blockquote
            key={item.id}
            className="flex h-full flex-col rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
          >
            {item.rating ? (
              <div className="mb-2 text-sm">
                <StarRating rating={item.rating} />
              </div>
            ) : null}
            <p className="flex-1 text-sm leading-relaxed text-zinc-700">&ldquo;{item.body}&rdquo;</p>
            <footer className="mt-4 text-sm font-semibold text-zinc-900">— {item.authorName}</footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}
