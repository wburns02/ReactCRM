import { useState, useEffect } from "react";
import { HeroSection } from "./components/HeroSection";
import { TrustSignals } from "./components/TrustSignals";
import { ServicesSection } from "./components/ServicesSection";
import { HowItWorksSection } from "./components/HowItWorksSection";
import { TestimonialsSection } from "./components/TestimonialsSection";
import { FAQSection } from "./components/FAQSection";
import { CTASection } from "./components/CTASection";
import { LandingFooter } from "./components/LandingFooter";
import type { UTMParams } from "./types/lead";

/**
 * Landing Page - Public-facing page for lead capture
 *
 * This page is designed to convert visitors into leads with:
 * - Compelling hero section with clear value proposition
 * - Trust signals (reviews, years in business, credentials)
 * - Service offerings
 * - How it works section
 * - Customer testimonials
 * - FAQ section
 * - Lead capture form with UTM tracking
 *
 * The page captures UTM parameters from the URL for marketing attribution.
 */
export function LandingPage() {
  const [utmParams, setUtmParams] = useState<UTMParams>({});

  // Capture UTM parameters from URL on mount
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

    // Update page title for SEO
    document.title =
      "Septic Tank Pumping & Repair | MAC Septic Services | East Central Texas";

    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  // Handle smooth scroll for anchor links
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

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <HeroSection utmParams={utmParams} />

      {/* Trust Signals Bar */}
      <TrustSignals />

      {/* Services Section */}
      <ServicesSection />

      {/* How It Works */}
      <HowItWorksSection />

      {/* Testimonials */}
      <TestimonialsSection />

      {/* FAQ Section */}
      <FAQSection />

      {/* Final CTA with Form */}
      <CTASection utmParams={utmParams} />

      {/* Footer */}
      <LandingFooter />

      {/* Sticky Mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 md:hidden z-50">
        <div className="flex gap-3">
          <a
            href="tel:+19365641440"
            className="flex-1 bg-mac-dark-blue text-white py-3 px-4 rounded-lg font-semibold text-center flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            Call
          </a>
          <a
            href="#quote"
            className="flex-1 bg-cta text-white py-3 px-4 rounded-lg font-semibold text-center"
          >
            Get Quote
          </a>
        </div>
      </div>

      {/* Bottom padding for mobile sticky CTA */}
      <div className="h-20 md:hidden" />
    </div>
  );
}
