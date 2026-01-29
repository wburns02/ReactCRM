import { useEffect } from "react";

/**
 * SEO Head Component
 *
 * Injects JSON-LD structured data for search engines:
 * - LocalBusiness schema (for Google Maps/Local Pack)
 * - FAQPage schema (for FAQ rich snippets)
 * - Service schema (for service-related searches)
 */
export function SEOHead() {
  useEffect(() => {
    // LocalBusiness Schema
    const localBusinessSchema = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "@id": "https://react.ecbtx.com/#business",
      name: "MAC Septic Services",
      description:
        "Professional septic tank pumping, inspection, and repair services in Central Texas. Family-owned since 1996 with 28+ years of experience.",
      url: "https://react.ecbtx.com/home",
      telephone: "+1-936-564-1440",
      email: "info@macseptic.com",
      foundingDate: "1996",
      priceRange: "$$",
      image: "https://react.ecbtx.com/og-image.png",
      logo: "https://react.ecbtx.com/logo.png",
      address: {
        "@type": "PostalAddress",
        streetAddress: "",
        addressLocality: "Nacogdoches",
        addressRegion: "TX",
        postalCode: "75961",
        addressCountry: "US",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: 31.6035,
        longitude: -94.6553,
      },
      areaServed: [
        {
          "@type": "City",
          name: "Nacogdoches",
          "@id": "https://www.wikidata.org/wiki/Q975641",
        },
        {
          "@type": "City",
          name: "Lufkin",
        },
        {
          "@type": "City",
          name: "Diboll",
        },
        {
          "@type": "City",
          name: "Huntington",
        },
        {
          "@type": "City",
          name: "Garrison",
        },
        {
          "@type": "City",
          name: "Cushing",
        },
        {
          "@type": "State",
          name: "Central Texas",
        },
      ],
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.9",
        ratingCount: "500",
        bestRating: "5",
        worstRating: "1",
      },
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          opens: "07:00",
          closes: "18:00",
        },
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: "Saturday",
          opens: "08:00",
          closes: "14:00",
        },
      ],
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Septic Services",
        itemListElement: [
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Septic Tank Pumping",
              description:
                "Professional septic tank pumping and cleaning services",
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Septic Inspection",
              description:
                "Comprehensive septic system inspections for home buyers and maintenance",
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Septic Repair",
              description:
                "Expert septic system repair and maintenance services",
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Emergency Septic Service",
              description: "24/7 emergency septic service for urgent issues",
            },
          },
        ],
      },
      sameAs: [
        "https://www.facebook.com/macseptic",
        "https://www.google.com/maps/place/MAC+Septic",
      ],
    };

    // FAQPage Schema
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How often should I pump my septic tank?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "For most households, we recommend pumping every 3-5 years. However, this can vary based on household size, tank size, and water usage. A family of 4 with a 1,000-gallon tank typically needs pumping every 3 years. We can assess your specific situation during a service call.",
          },
        },
        {
          "@type": "Question",
          name: "How much does septic tank pumping cost?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Pricing depends on tank size, accessibility, and current condition. Most residential pumping jobs range from $300-$500. We provide free, no-obligation quotes so you know exactly what to expect. No hidden fees, ever.",
          },
        },
        {
          "@type": "Question",
          name: "What are signs I need septic service?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Watch for slow drains throughout the house, gurgling sounds in pipes, sewage odors inside or outside, wet spots or lush grass over the drain field, and sewage backup in the lowest drains. If you notice any of these, call us right away to prevent bigger problems.",
          },
        },
        {
          "@type": "Question",
          name: "Do you offer emergency services?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes! We provide 24/7 emergency septic service. Backups and overflows can't wait, and neither do we. Call our emergency line anytime and we'll respond as quickly as possible, often within a few hours.",
          },
        },
        {
          "@type": "Question",
          name: "What areas do you serve?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "We proudly serve Central Texas including Nacogdoches, Lufkin, Diboll, Huntington, Garrison, Cushing, and surrounding communities. If you're unsure whether we serve your area, give us a call and we'll let you know.",
          },
        },
        {
          "@type": "Question",
          name: "Are you licensed and insured?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Absolutely. We are fully licensed by the State of Texas (TCEQ) and carry comprehensive liability insurance. Our technicians are trained professionals with years of experience. You can trust that your property and septic system are in good hands.",
          },
        },
      ],
    };

    // Create and inject LocalBusiness script
    const localBusinessScript = document.createElement("script");
    localBusinessScript.type = "application/ld+json";
    localBusinessScript.id = "local-business-schema";
    localBusinessScript.textContent = JSON.stringify(localBusinessSchema);

    // Create and inject FAQ script
    const faqScript = document.createElement("script");
    faqScript.type = "application/ld+json";
    faqScript.id = "faq-schema";
    faqScript.textContent = JSON.stringify(faqSchema);

    // Remove existing scripts if present (for HMR)
    const existingLocalBusiness = document.getElementById(
      "local-business-schema"
    );
    const existingFaq = document.getElementById("faq-schema");
    if (existingLocalBusiness) existingLocalBusiness.remove();
    if (existingFaq) existingFaq.remove();

    // Append to head
    document.head.appendChild(localBusinessScript);
    document.head.appendChild(faqScript);

    // Cleanup on unmount
    return () => {
      const localBusinessEl = document.getElementById("local-business-schema");
      const faqEl = document.getElementById("faq-schema");
      if (localBusinessEl) localBusinessEl.remove();
      if (faqEl) faqEl.remove();
    };
  }, []);

  // This component doesn't render anything visible
  return null;
}
