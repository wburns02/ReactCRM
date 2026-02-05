import { useState } from "react";

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "How often should I pump my septic tank?",
      answer:
        "For most households, we recommend pumping every 3-5 years. However, this can vary based on household size, tank size, and water usage. A family of 4 with a 1,000-gallon tank typically needs pumping every 3 years. We can assess your specific situation during a service call.",
    },
    {
      question: "How much does septic tank pumping cost?",
      answer:
        "Pricing depends on tank size, accessibility, and current condition. Most residential pumping jobs range from $300-$500. We provide free, no-obligation quotes so you know exactly what to expect. No hidden fees, ever.",
    },
    {
      question: "What are signs I need septic service?",
      answer:
        "Watch for slow drains throughout the house, gurgling sounds in pipes, sewage odors inside or outside, wet spots or lush grass over the drain field, and sewage backup in the lowest drains. If you notice any of these, call us right away to prevent bigger problems.",
    },
    {
      question: "Do you offer emergency services?",
      answer:
        "Yes! We provide 24/7 emergency septic service. Backups and overflows can't wait, and neither do we. Call our emergency line anytime and we'll respond as quickly as possible, often within a few hours.",
    },
    {
      question: "What areas do you serve?",
      answer:
        "We proudly serve East Central Texas including Nacogdoches, Lufkin, Diboll, Huntington, Garrison, Cushing, and surrounding communities. If you're unsure whether we serve your area, give us a call and we'll let you know.",
    },
    {
      question: "Are you licensed and insured?",
      answer:
        "Absolutely. We are fully licensed by the State of Texas (TCEQ) and carry comprehensive liability insurance. Our technicians are trained professionals with years of experience. You can trust that your property and septic system are in good hands.",
    },
  ];

  return (
    <section aria-labelledby="faq-heading" className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 id="faq-heading" className="text-3xl md:text-4xl font-bold text-mac-dark-blue mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Got questions? We've got answers. Here are the most common things
            our customers ask.
          </p>
        </div>

        {/* FAQ accordion */}
        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            const buttonId = `faq-button-${index}`;
            const panelId = `faq-panel-${index}`;

            return (
              <div
                key={index}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <button
                  id={buttonId}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="w-full flex items-center justify-between p-5 text-left bg-white hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900 pr-4">
                    {faq.question}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-500 shrink-0 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  hidden={!isOpen}
                >
                  <div className="p-5 pt-0 text-gray-600 leading-relaxed">
                    {faq.answer}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Still have questions */}
        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">Still have questions?</p>
          <a
            href="tel:+19365641440"
            aria-label="Call MAC Septic at (936) 564-1440"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:text-primary-hover transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            Call us at (936) 564-1440
          </a>
        </div>
      </div>
    </section>
  );
}
