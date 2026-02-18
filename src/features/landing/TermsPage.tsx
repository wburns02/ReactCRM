import { useEffect } from "react";
import { Link } from "react-router-dom";

export function TermsPage() {
  useEffect(() => {
    document.title = "Terms of Service | MAC Septic Services";
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-mac-dark-blue to-mac-navy text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <Link to="/home" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-mac-dark-blue"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M19 8h-1V6c0-1.1-.9-2-2-2H8C6.9 4 6 4.9 6 6v2H5c-1.1 0-2 .9-2 2v5h2v5h14v-5h2v-5c0-1.1-.9-2-2-2zM8 6h8v2H8V6zm9 14H7v-3h10v3zm2-5H5v-3c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v3z" />
                </svg>
              </div>
              <span className="text-xl font-bold">MAC Septic Services</span>
            </Link>
            <Link
              to="/home"
              className="text-sm text-blue-200 hover:text-white transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-500 mb-10">Last updated: February 18, 2026</p>

        <div className="prose prose-lg max-w-none text-gray-700 space-y-8">
          {/* Agreement to Terms */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Agreement to Terms</h2>
            <p>
              These Terms of Service ("Terms") constitute a legally binding agreement between you
              and MAC Septic Services ("Company," "we," "our," or "us"), located in Nacogdoches,
              Texas. By accessing or using our website at{" "}
              <a href="https://react.ecbtx.com" className="text-mac-dark-blue hover:underline">
                react.ecbtx.com
              </a>
              , our customer portal, or engaging our septic services, you agree to be bound by
              these Terms.
            </p>
            <p>
              If you do not agree to these Terms, you must not access or use our website or
              services. We reserve the right to modify these Terms at any time. Continued use of
              our services after modifications constitutes acceptance of the revised Terms.
            </p>
          </section>

          {/* Service Description */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Service Description</h2>
            <p>
              MAC Septic Services provides professional septic system services in East Central
              Texas, including but not limited to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Septic tank pumping and cleaning</li>
              <li>Septic system inspections (conventional and aerobic)</li>
              <li>System repair and maintenance</li>
              <li>New septic system installation</li>
              <li>Emergency septic services (24/7 availability)</li>
              <li>Grease trap cleaning</li>
              <li>Aerobic system maintenance and compliance inspections</li>
            </ul>
            <p className="mt-4">
              All services are performed by licensed and insured technicians in compliance with
              Texas Commission on Environmental Quality (TCEQ) regulations.
            </p>
          </section>

          {/* Customer Portal */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Customer Portal and Online Services</h2>
            <p>
              We provide an online customer portal that allows you to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>View your service history and inspection reports</li>
              <li>Schedule appointments and request quotes</li>
              <li>View and pay invoices online</li>
              <li>Track the status of active work orders</li>
              <li>Communicate with our service team</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 mb-3 mt-6">3.1 Account Responsibilities</h3>
            <p>If you create an account on our platform, you are responsible for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Maintaining the confidentiality of your login credentials</li>
              <li>All activity that occurs under your account</li>
              <li>Notifying us immediately of any unauthorized access or security breach</li>
              <li>Ensuring that the information you provide is accurate and current</li>
            </ul>
            <p className="mt-4">
              We reserve the right to suspend or terminate accounts that violate these Terms or
              are used for unauthorized purposes.
            </p>
          </section>

          {/* Scheduling and Service Appointments */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Scheduling and Service Appointments</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Scheduling:</strong> Appointments may be scheduled online, by phone, or
                through our customer portal. Scheduled times are approximate and may vary based on
                route conditions and prior service completion.
              </li>
              <li>
                <strong>Access:</strong> You are responsible for providing safe and reasonable
                access to your property and septic system for our technicians.
              </li>
              <li>
                <strong>Cancellation:</strong> We request at least 24 hours' notice for
                cancellations. Repeated no-shows or late cancellations may result in a
                cancellation fee.
              </li>
              <li>
                <strong>Emergency Services:</strong> Emergency service requests are handled on a
                priority basis and may be subject to after-hours or emergency service rates.
              </li>
            </ul>
          </section>

          {/* Estimates, Pricing, and Payment */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Estimates, Pricing, and Payment Terms</h2>

            <h3 className="text-xl font-medium text-gray-800 mb-3">5.1 Estimates and Quotes</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Estimates provided are based on the information available at the time and are
                subject to change upon physical inspection of the system.
              </li>
              <li>
                Formal quotes are valid for 30 days from the date of issuance unless otherwise
                stated.
              </li>
              <li>
                Additional work discovered during service (e.g., unexpected repairs) will be
                communicated to you for approval before proceeding.
              </li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 mb-3 mt-6">5.2 Pricing</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                All prices are quoted in US Dollars and are subject to applicable state and local
                sales tax.
              </li>
              <li>
                We reserve the right to adjust pricing with reasonable notice. Price changes do not
                affect previously accepted quotes.
              </li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 mb-3 mt-6">5.3 Payment</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Payment is due upon completion of services unless other arrangements have been
                made in advance.
              </li>
              <li>
                We accept payment via credit card, debit card, check, cash, and online payment
                through our customer portal (powered by Clover).
              </li>
              <li>
                Invoices not paid within 30 days of the due date may be subject to a late payment
                fee of 1.5% per month on the outstanding balance.
              </li>
              <li>
                We reserve the right to suspend future services for accounts with overdue
                balances.
              </li>
            </ul>
          </section>

          {/* Warranties and Guarantees */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Warranties and Service Guarantees</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                We warrant that all services will be performed in a professional and workmanlike
                manner in accordance with industry standards and applicable regulations.
              </li>
              <li>
                Repair work is warranted for a period specified at the time of service (typically
                90 days for parts and labor, unless otherwise stated).
              </li>
              <li>
                Warranty claims must be reported within the warranty period and are subject to
                inspection by our team.
              </li>
              <li>
                Warranties do not cover damage caused by misuse, neglect, unauthorized
                modifications, acts of nature, or failure to follow maintenance recommendations.
              </li>
            </ul>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                MAC Septic Services shall not be liable for any indirect, incidental, special,
                consequential, or punitive damages arising from or related to the use of our
                services or website.
              </li>
              <li>
                Our total liability for any claim arising from our services shall not exceed the
                amount paid by you for the specific service giving rise to the claim.
              </li>
              <li>
                We are not liable for delays or failures in service performance caused by
                circumstances beyond our reasonable control, including but not limited to severe
                weather, natural disasters, utility failures, or government actions.
              </li>
              <li>
                The information provided on our website is for general informational purposes
                only. While we strive for accuracy, we do not warrant that all information is
                complete, current, or error-free.
              </li>
            </ul>
          </section>

          {/* Indemnification */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless MAC Septic Services, its owners,
              employees, technicians, and agents from and against any claims, liabilities, damages,
              losses, costs, or expenses (including reasonable attorneys' fees) arising from:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your violation of these Terms</li>
              <li>Your misuse of our services or website</li>
              <li>Your violation of any applicable law or regulation</li>
              <li>Any inaccurate information you provide to us</li>
            </ul>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Intellectual Property</h2>
            <p>
              All content on our website, including text, graphics, logos, images, software, and
              design elements, is the property of MAC Septic Services or its licensors and is
              protected by copyright, trademark, and other intellectual property laws.
            </p>
            <p>
              You may not reproduce, distribute, modify, or create derivative works from any
              content on our website without our prior written consent.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Governing Law and Dispute Resolution</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the
              State of Texas, without regard to its conflict of law provisions.
            </p>
            <p>
              Any disputes arising from or related to these Terms or our services shall be
              resolved as follows:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Informal Resolution:</strong> We encourage you to contact us first to
                resolve any concerns informally. Many issues can be resolved through direct
                communication.
              </li>
              <li>
                <strong>Mediation:</strong> If informal resolution is unsuccessful, either party
                may request non-binding mediation in Nacogdoches County, Texas.
              </li>
              <li>
                <strong>Jurisdiction:</strong> Any legal proceedings shall be brought exclusively
                in the state or federal courts located in Nacogdoches County, Texas, and you
                consent to the personal jurisdiction of such courts.
              </li>
            </ul>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Termination</h2>
            <p>
              We may terminate or suspend your access to our website or customer portal at any
              time, with or without cause, and with or without notice. Upon termination:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your right to access the customer portal will cease immediately</li>
              <li>Outstanding payment obligations survive termination</li>
              <li>Warranties on completed work remain in effect for their stated duration</li>
              <li>We may retain your service records as required by law or regulation</li>
            </ul>
          </section>

          {/* Severability */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Severability</h2>
            <p>
              If any provision of these Terms is found to be invalid, illegal, or unenforceable by
              a court of competent jurisdiction, the remaining provisions shall continue in full
              force and effect. The invalid provision shall be modified to the minimum extent
              necessary to make it valid and enforceable.
            </p>
          </section>

          {/* Entire Agreement */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Entire Agreement</h2>
            <p>
              These Terms, together with our{" "}
              <Link to="/privacy" className="text-mac-dark-blue hover:underline">
                Privacy Policy
              </Link>
              , constitute the entire agreement between you and MAC Septic Services regarding the
              use of our website and services. These Terms supersede any prior agreements or
              communications regarding the same subject matter.
            </p>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Contact Us</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <div className="bg-gray-50 rounded-lg p-6 mt-4">
              <p className="font-semibold text-gray-900 text-lg mb-3">MAC Septic Services</p>
              <div className="space-y-2 text-gray-700">
                <p className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  <a href="mailto:info@macseptic.com" className="text-mac-dark-blue hover:underline">
                    info@macseptic.com
                  </a>
                </p>
                <p className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  <a href="tel:+19365641440" className="text-mac-dark-blue hover:underline">
                    (936) 564-1440
                  </a>
                </p>
                <p className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  Nacogdoches, TX
                </p>
                <p className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.497-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.029 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
                  </svg>
                  <a href="https://react.ecbtx.com" className="text-mac-dark-blue hover:underline">
                    react.ecbtx.com
                  </a>
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} MAC Septic Services. All rights reserved.</p>
            <div className="flex gap-6">
              <Link to="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <span className="text-white font-medium">Terms of Service</span>
              <Link to="/home" className="hover:text-white transition-colors">
                Home
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
