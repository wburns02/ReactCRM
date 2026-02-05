export function TestimonialsSection() {
  const testimonials = [
    {
      name: "Sarah M.",
      location: "Nacogdoches, TX",
      text: "Fast response, fair pricing, and professional service. They pumped our tank the same day we called. Highly recommend!",
      rating: 5,
    },
    {
      name: "Robert J.",
      location: "Lufkin, TX",
      text: "We've used MAC Septic for 10 years now. Always reliable, always on time. The technicians are knowledgeable and courteous.",
      rating: 5,
    },
    {
      name: "Jennifer H.",
      location: "Diboll, TX",
      text: "Had an emergency backup on a Sunday and they came out within 2 hours. Saved us from a disaster. Can't thank them enough!",
      rating: 5,
    },
    {
      name: "Michael T.",
      location: "Huntington, TX",
      text: "Professional from start to finish. They explained everything clearly and the pricing was exactly as quoted. No surprises.",
      rating: 5,
    },
    {
      name: "Linda K.",
      location: "Garrison, TX",
      text: "Best septic service in East Texas! They helped us when we were buying our home with a thorough inspection.",
      rating: 5,
    },
    {
      name: "David W.",
      location: "Cushing, TX",
      text: "Family business you can trust. Three generations of expertise really shows in their work quality.",
      rating: 5,
    },
  ];

  return (
    <section aria-labelledby="testimonials-heading" className="py-16 md:py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 id="testimonials-heading" className="text-3xl md:text-4xl font-bold text-mac-dark-blue mb-4">
            What Our Customers Say
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Don't just take our word for it. Here's what our neighbors are
            saying about MAC Septic Services.
          </p>
          {/* Google Reviews badge */}
          <div className="inline-flex items-center gap-2 mt-4 bg-white px-4 py-2 rounded-full shadow-sm">
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="font-semibold text-gray-800">4.9</span>
            <span className="text-gray-500">(500+ reviews)</span>
          </div>
        </div>

        {/* Testimonials grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4" aria-hidden="true">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-5 h-5 text-yellow-400 fill-current"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
              </div>
              <span className="sr-only">{testimonial.rating} out of 5 stars</span>

              {/* Quote */}
              <p className="text-gray-700 mb-4 leading-relaxed">
                "{testimonial.text}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary font-semibold">
                    {testimonial.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {testimonial.location}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View all reviews link */}
        <div className="text-center mt-8">
          <a
            href="https://www.google.com/search?q=mac+septic+services+reviews"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:text-primary-hover transition-colors"
          >
            Read all reviews on Google
            <span className="sr-only">(opens in new tab)</span>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
