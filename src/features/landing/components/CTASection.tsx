import { useState } from "react";
import type { UTMParams } from "../types/lead";
import { LeadCaptureForm } from "./LeadCaptureForm";
import { BookingForm } from "./BookingForm";
import { CTAOptionTabs, type CTAOption } from "./CTAOptionTabs";

interface CTASectionProps {
  utmParams: UTMParams;
}

// Benefits for Book & Pay option
const BOOK_BENEFITS = [
  "Skip the scheduling wait",
  "Instant confirmation",
  "Secure payment (not charged until service)",
  "Same-day service available",
  "$575 base price, transparent overage",
];

// Benefits for Get Quote option
const QUOTE_BENEFITS = [
  "Free, no-obligation quotes",
  "Same-day service often available",
  "Upfront pricing - no hidden fees",
  "Licensed, insured, and experienced",
  "Family-owned since 1996",
];

export function CTASection({ utmParams }: CTASectionProps) {
  const [activeOption, setActiveOption] = useState<CTAOption>("book");

  const benefits = activeOption === "book" ? BOOK_BENEFITS : QUOTE_BENEFITS;

  return (
    <section
      id="quote"
      className="py-16 md:py-24 bg-gradient-to-br from-mac-dark-blue to-mac-navy"
    >
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-start max-w-6xl mx-auto">
          {/* Left: Content */}
          <div className="text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {activeOption === "book"
                ? "Ready to Book Your Service?"
                : "Ready for Reliable Septic Service?"}
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              {activeOption === "book"
                ? "Schedule now at $575 and get instant confirmation."
                : "Get your free quote today. Most requests receive a response within 1 business hour."}
            </p>

            {/* Benefits list - dynamic based on selection */}
            <ul className="space-y-4 mb-8">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-blue-100">{benefit}</span>
                </li>
              ))}
            </ul>

            {/* Contact info */}
            <div className="bg-white/10 backdrop-blur rounded-lg p-6">
              <h3 className="font-semibold mb-4">Prefer to call?</h3>
              <a
                href="tel:+19365641440"
                className="flex items-center gap-3 text-2xl font-bold hover:text-mac-light-blue transition-colors"
              >
                <svg
                  className="w-8 h-8"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                (936) 564-1440
              </a>
              <p className="text-sm text-blue-200 mt-2">
                Available 24/7 for emergencies
              </p>
            </div>
          </div>

          {/* Right: Form with Tabs */}
          <div className="bg-white rounded-xl p-6 md:p-8 shadow-2xl">
            {/* Tab Selector */}
            <CTAOptionTabs
              activeOption={activeOption}
              onChange={setActiveOption}
            />

            {/* Book & Pay Content */}
            {activeOption === "book" && (
              <div role="tabpanel" id="panel-book" aria-labelledby="tab-book">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">
                    Schedule & Pay
                  </h3>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="text-3xl font-bold text-green-600">
                      $575
                    </span>
                    <span className="text-gray-500">up to 1,750 gal</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Card pre-authorized, charged after service
                  </p>
                </div>
                <BookingForm testMode={true} />
              </div>
            )}

            {/* Get Quote Content */}
            {activeOption === "quote" && (
              <div role="tabpanel" id="panel-quote" aria-labelledby="tab-quote">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">
                    Get Your Free Quote
                  </h3>
                  <p className="text-gray-600">
                    Fill out the form and we'll get back to you ASAP
                  </p>
                </div>
                <LeadCaptureForm utmParams={utmParams} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
