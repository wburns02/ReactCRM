import type { UTMParams } from "../types/lead";

interface HeroSectionProps {
  utmParams: UTMParams;
}

export function HeroSection({ utmParams }: HeroSectionProps) {
  // Build URL with UTM params for CTA links
  const quoteUrl = `#quote${utmParams.utm_source ? `?utm_source=${utmParams.utm_source}` : ""}`;

  return (
    <section className="relative bg-gradient-to-br from-mac-dark-blue via-mac-navy to-mac-dark-blue overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative container mx-auto px-4 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="text-white">
            {/* MAC Septic Logo/Brand */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-lg">
                <svg
                  className="w-10 h-10 text-mac-dark-blue"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19 8h-1V6c0-1.1-.9-2-2-2H8C6.9 4 6 4.9 6 6v2H5c-1.1 0-2 .9-2 2v5h2v5h14v-5h2v-5c0-1.1-.9-2-2-2zM8 6h8v2H8V6zm9 14H7v-3h10v3zm2-5H5v-3c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  MAC Septic
                </h2>
                <p className="text-sm text-blue-200">Central Texas Experts</p>
              </div>
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full text-sm mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span>Same-Day Service Available</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Fast, Reliable{" "}
              <span className="text-mac-light-blue">Septic Service</span> in
              Central Texas
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-blue-100 mb-8 max-w-xl">
              Professional septic tank pumping, inspection, and repair.
              Licensed, insured, and trusted by{" "}
              <strong className="text-white">5,000+ homeowners</strong> since
              1996.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <a
                href={quoteUrl}
                className="bg-cta hover:bg-cta-hover text-white px-8 py-4 rounded-lg font-semibold text-lg text-center transition-all hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Get Your Free Quote
              </a>
              <a
                href="tel:+19365641440"
                className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-lg font-semibold text-lg text-center border border-white/30 transition-all flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                Call (936) 564-1440
              </a>
            </div>

            {/* Trust badges row */}
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="flex text-yellow-400">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg
                      key={i}
                      className="w-4 h-4 fill-current"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <span className="text-white">
                  4.9 <span className="text-blue-200">(500+ reviews)</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-blue-200">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Licensed & Insured</span>
              </div>
              <div className="flex items-center gap-2 text-blue-200">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>28+ Years Experience</span>
              </div>
            </div>
          </div>

          {/* Right: Image/Visual */}
          <div className="hidden lg:block relative">
            <div className="relative w-full aspect-square max-w-md mx-auto">
              {/* Decorative circles */}
              <div className="absolute inset-0 bg-mac-light-blue/20 rounded-full blur-3xl" />
              <div className="absolute inset-8 bg-white/10 rounded-full" />

              {/* Truck/Service icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white/90">
                  <svg
                    className="w-48 h-48"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                  </svg>
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg px-4 py-2 text-sm">
                <div className="font-bold text-mac-dark-blue">24/7</div>
                <div className="text-gray-600 text-xs">Emergency</div>
              </div>
              <div className="absolute bottom-8 left-0 bg-white rounded-lg shadow-lg px-4 py-2 text-sm">
                <div className="font-bold text-green-600">5,000+</div>
                <div className="text-gray-600 text-xs">Jobs Completed</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" className="w-full h-auto">
          <path
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="white"
          />
        </svg>
      </div>
    </section>
  );
}
