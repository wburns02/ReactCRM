import { useState, useEffect, lazy, Suspense } from "react";
import { LeadCaptureForm } from "../components/LeadCaptureForm";
import { CTAOptionTabs, type CTAOption } from "../components/CTAOptionTabs";
import { NashvilleBookingForm } from "../components/NashvilleBookingForm";
import { PricingSection } from "../components/PricingSection";
import type { UTMParams } from "../types/lead";

// Lazy-load below-fold sections
const FAQSection = lazy(() =>
  import("../components/FAQSection").then((m) => ({ default: m.FAQSection }))
);

// Nashville-specific config
const NASHVILLE_PHONE = "(615) 555-0175";
const NASHVILLE_PHONE_TEL = "tel:+16155550175";
const NASHVILLE_SERVICE_AREA = "Nashville & Middle Tennessee";

const BOOK_BENEFITS = [
  "Skip the scheduling wait",
  "Instant confirmation",
  "No payment required to book",
  "Same-day service available",
  "Packages starting at $595",
];

const QUOTE_BENEFITS = [
  "Free, no-obligation quotes",
  "Same-day service often available",
  "Upfront pricing - no hidden fees",
  "Licensed, insured, and experienced",
  "Locally operated in Nashville",
];

export function NashvilleLandingPage() {
  const [utmParams, setUtmParams] = useState<UTMParams>({});
  const [activeOption, setActiveOption] = useState<CTAOption>("book");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUtmParams({
      utm_source: params.get("utm_source") || undefined,
      utm_medium: params.get("utm_medium") || undefined,
      utm_campaign: params.get("utm_campaign") || undefined,
      utm_term: params.get("utm_term") || undefined,
      utm_content: params.get("utm_content") || undefined,
      gclid: params.get("gclid") || undefined,
    });
    document.title =
      "Septic Tank Pumping & Repair | MAC Septic | Nashville TN";
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLAnchorElement;
      if (target.hash && target.hash.startsWith("#")) {
        e.preventDefault();
        const element = document.querySelector(target.hash);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }
    };
    document.addEventListener("click", handleAnchorClick);
    return () => document.removeEventListener("click", handleAnchorClick);
  }, []);

  const benefits = activeOption === "book" ? BOOK_BENEFITS : QUOTE_BENEFITS;

  return (
    <main className="min-h-screen bg-white">
      <a
        href="#nashville-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-mac-dark-blue focus:text-white focus:rounded-md"
      >
        Skip to main content
      </a>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-mac-dark-blue via-mac-navy to-mac-dark-blue overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <div id="nashville-content" className="relative container mx-auto px-4 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div className="text-white">
              <div className="flex items-center gap-3 mb-6">
                <img src="/logo-white.png" alt="MAC Septic" className="h-14 w-auto" />
              </div>

              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full text-sm mb-6">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span>Now Serving Nashville &amp; Middle Tennessee</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Fast, Reliable{" "}
                <span className="text-mac-light-blue">Septic Service</span> in{" "}
                {NASHVILLE_SERVICE_AREA}
              </h1>

              <p className="text-xl text-blue-100 mb-8 max-w-xl">
                Professional septic tank pumping, inspection, and repair.
                Licensed, insured, and ready to serve the{" "}
                <strong className="text-white">Nashville metro area</strong>.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <a
                  href="#quote"
                  className="bg-cta hover:bg-cta-hover text-white px-8 py-4 rounded-lg font-semibold text-lg text-center transition-all hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Get Your Free Quote
                </a>
                <a
                  href={NASHVILLE_PHONE_TEL}
                  className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-lg font-semibold text-lg text-center border border-white/30 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Call {NASHVILLE_PHONE}
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="flex text-yellow-400">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-white">
                    4.9 <span className="text-blue-200">(500+ reviews)</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-blue-200">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Licensed &amp; Insured</span>
                </div>
                <div className="flex items-center gap-2 text-blue-200">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <span>Nashville &amp; Surrounding Areas</span>
                </div>
              </div>
            </div>

            {/* Right: Visual */}
            <div className="hidden lg:block relative">
              <div className="relative w-full aspect-square max-w-md mx-auto">
                <div className="absolute inset-0 bg-mac-light-blue/20 rounded-full blur-3xl" />
                <div className="absolute inset-8 bg-white/10 rounded-full" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white/90">
                    <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                    </svg>
                  </div>
                </div>
                <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg px-4 py-2 text-sm">
                  <div className="font-bold text-mac-dark-blue">24/7</div>
                  <div className="text-gray-600 text-xs">Emergency</div>
                </div>
                <div className="absolute bottom-8 left-0 bg-white rounded-lg shadow-lg px-4 py-2 text-sm">
                  <div className="font-bold text-green-600">From $595</div>
                  <div className="text-gray-600 text-xs">Up to 1,000 gal</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" className="w-full h-auto">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── Trust Signals ───────────────────────────────────────────── */}
      <section className="py-8 bg-white border-b border-gray-100">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              { value: "28+", label: "Years in Business" },
              { value: "5,000+", label: "Jobs Completed" },
              { value: "4.9", label: "Star Rating" },
              { value: "24/7", label: "Emergency Service" },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-4 justify-center md:justify-start">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
                  <span className="text-xl font-bold">{stat.value.charAt(0)}</span>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-mac-dark-blue">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-mac-dark-blue mb-4">
              Our Septic Services in Nashville
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From routine pumping to emergency repairs, we handle all your
              septic system needs across Middle Tennessee.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Septic Tank Pumping", desc: "Regular pumping keeps your system healthy. We recommend every 3-5 years for most homes.", popular: true },
              { title: "Septic Inspection", desc: "Comprehensive inspection for real estate transactions or preventive maintenance." },
              { title: "Repair & Maintenance", desc: "Expert diagnosis and repair of septic issues. We fix problems before they become emergencies." },
              { title: "New Installation", desc: "Full septic system installation for new construction or system replacement." },
              { title: "Emergency Service", desc: "24/7 emergency response for backups, overflows, and urgent septic problems.", urgent: true },
              { title: "Grease Trap Cleaning", desc: "Commercial grease trap pumping and maintenance to keep your business compliant." },
            ].map((svc, i) => (
              <div key={i} className={`bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border ${
                svc.urgent ? "border-red-200 bg-red-50/50" : svc.popular ? "border-primary/30" : "border-gray-100"
              }`}>
                {svc.popular && <span className="inline-block bg-primary text-white text-xs font-semibold px-2 py-1 rounded mb-3">Most Popular</span>}
                {svc.urgent && <span className="inline-block bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded mb-3">24/7 Available</span>}
                <h3 className="text-xl font-bold text-gray-900 mb-2">{svc.title}</h3>
                <p className="text-gray-600">{svc.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <a href="#quote" className="inline-flex items-center gap-2 text-primary font-semibold hover:text-primary-hover transition-colors">
              Get a free consultation
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* ── Service Area ────────────────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-mac-dark-blue mb-4">
              Serving Nashville &amp; Middle Tennessee
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We proudly serve homeowners and businesses across the greater Nashville area.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              "Nashville", "Franklin", "Murfreesboro", "Hendersonville",
              "Mt. Juliet", "Lebanon", "Gallatin", "Spring Hill",
              "Brentwood", "Smyrna", "La Vergne", "Goodlettsville",
            ].map((city) => (
              <div key={city} className="flex items-center gap-2 text-gray-700">
                <svg className="w-4 h-4 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {city}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────── */}
      <PricingSection phone={NASHVILLE_PHONE} phoneTel={NASHVILLE_PHONE_TEL} />

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <Suspense fallback={<div className="min-h-[200px]" />}>
        <FAQSection
          phone={NASHVILLE_PHONE}
          phoneTel={NASHVILLE_PHONE_TEL}
          serviceArea="Nashville and Middle Tennessee including Franklin, Murfreesboro, Hendersonville, Mt. Juliet, Lebanon, Gallatin, Spring Hill, Brentwood, and surrounding communities"
        />
      </Suspense>

      {/* ── CTA / Booking Section ───────────────────────────────────── */}
      <section id="quote" className="py-16 md:py-24 bg-gradient-to-br from-mac-dark-blue to-mac-navy">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-start max-w-6xl mx-auto">
            <div className="text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                {activeOption === "book"
                  ? "Ready to Book Your Service?"
                  : "Ready for Reliable Septic Service?"}
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                {activeOption === "book"
                  ? "Schedule now and get instant confirmation. Packages from $595."
                  : "Get your free quote today. Most requests receive a response within 1 business hour."}
              </p>

              <ul className="space-y-4 mb-8">
                {benefits.map((benefit, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-blue-100">{benefit}</span>
                  </li>
                ))}
              </ul>

              <div className="bg-white/10 backdrop-blur rounded-lg p-6">
                <h3 className="font-semibold mb-4">Prefer to call?</h3>
                <a href={NASHVILLE_PHONE_TEL} className="flex items-center gap-3 text-2xl font-bold hover:text-mac-light-blue transition-colors">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  {NASHVILLE_PHONE}
                </a>
                <p className="text-sm text-blue-200 mt-2">Available 24/7 for emergencies</p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 md:p-8 shadow-2xl">
              <CTAOptionTabs activeOption={activeOption} onChange={setActiveOption} />

              {activeOption === "book" && (
                <div>
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900">Schedule Your Service</h3>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <span className="text-3xl font-bold text-green-600">From $595</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Maintenance Plan $595 | Standard $625 | Real Estate $825</p>
                  </div>
                  <NashvilleBookingForm testMode={true} />
                </div>
              )}

              {activeOption === "quote" && (
                <div>
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900">Get Your Free Quote</h3>
                    <p className="text-gray-600">Fill out the form and we'll get back to you ASAP</p>
                  </div>
                  <LeadCaptureForm utmParams={utmParams} />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <img src="/logo-white.png" alt="MAC Septic" className="h-10 w-auto mb-4" />
              <p className="text-gray-400 text-sm">
                Professional septic services serving Nashville and Middle Tennessee.
                Licensed, insured, and committed to quality.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Contact</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <p>
                  <a href={NASHVILLE_PHONE_TEL} className="hover:text-white transition-colors">
                    {NASHVILLE_PHONE}
                  </a>
                </p>
                <p>Nashville, TN</p>
                <p>Available 24/7 for Emergencies</p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Service Area</h4>
              <p className="text-sm text-gray-400">
                Nashville, Franklin, Murfreesboro, Hendersonville, Mt. Juliet,
                Lebanon, Gallatin, Spring Hill, Brentwood, and surrounding areas.
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 text-center text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} MAC Septic Services. All rights reserved.</p>
            <div className="mt-2 space-x-4">
              <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Sticky Mobile CTA ───────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 md:hidden z-50">
        <div className="flex gap-3">
          <a
            href={NASHVILLE_PHONE_TEL}
            className="flex-1 bg-mac-dark-blue text-white py-3 px-4 rounded-lg font-semibold text-center flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            Call
          </a>
          <a href="#quote" className="flex-1 bg-cta text-white py-3 px-4 rounded-lg font-semibold text-center">
            Get Quote
          </a>
        </div>
      </nav>
      <div className="h-20 md:hidden" />
    </main>
  );
}
