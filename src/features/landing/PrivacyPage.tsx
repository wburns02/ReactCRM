import { useEffect } from "react";
import { Link } from "react-router-dom";

export function PrivacyPage() {
  useEffect(() => {
    document.title = "Privacy Policy | MAC Septic Services";
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
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 mb-10">Last updated: February 18, 2026</p>

        <div className="prose prose-lg max-w-none text-gray-700 space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p>
              MAC Septic Services ("we," "our," or "us") is committed to protecting the privacy
              of our customers and website visitors. This Privacy Policy describes how we collect,
              use, disclose, and safeguard your personal information when you visit our website at{" "}
              <a href="https://react.ecbtx.com" className="text-mac-dark-blue hover:underline">
                react.ecbtx.com
              </a>{" "}
              or use our services.
            </p>
            <p>
              By using our website or services, you agree to the collection and use of information
              in accordance with this policy. If you do not agree with the terms of this Privacy
              Policy, please do not access or use our services.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-medium text-gray-800 mb-3">2.1 Personal Information</h3>
            <p>We may collect the following personal information when you interact with our services:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Contact Information:</strong> Name, email address, phone number, and
                mailing address
              </li>
              <li>
                <strong>Service Address:</strong> Property address where septic services are
                performed
              </li>
              <li>
                <strong>Payment Information:</strong> Billing address, credit card or payment
                details (processed securely through our payment processor)
              </li>
              <li>
                <strong>Account Information:</strong> Username, password, and account preferences
                for our customer portal
              </li>
              <li>
                <strong>Communication Records:</strong> Records of phone calls, emails, text
                messages, and other communications with our team
              </li>
              <li>
                <strong>Service Records:</strong> Work order history, inspection reports, equipment
                details, and service notes related to your property
              </li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 mb-3 mt-6">2.2 Automatically Collected Information</h3>
            <p>When you visit our website, we may automatically collect:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>IP address and approximate geographic location</li>
              <li>Browser type, version, and operating system</li>
              <li>Pages visited, time spent on pages, and navigation patterns</li>
              <li>Referring website or source (including UTM tracking parameters)</li>
              <li>Device type and screen resolution</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p>We use the information we collect for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Providing Services:</strong> To schedule, perform, and follow up on septic
                services at your property
              </li>
              <li>
                <strong>Communication:</strong> To contact you regarding appointments,
                service reminders, estimates, invoices, and important updates
              </li>
              <li>
                <strong>Payment Processing:</strong> To process payments for services rendered
              </li>
              <li>
                <strong>Customer Portal:</strong> To provide access to your account, service
                history, and scheduling tools
              </li>
              <li>
                <strong>Improving Our Services:</strong> To analyze usage patterns and improve our
                website, services, and customer experience
              </li>
              <li>
                <strong>Marketing:</strong> To send promotional offers, newsletters, and service
                reminders (with your consent, where required)
              </li>
              <li>
                <strong>Legal Compliance:</strong> To comply with applicable laws, regulations, and
                legal processes
              </li>
            </ul>
          </section>

          {/* Cookies and Tracking */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Cookies and Tracking Technologies</h2>
            <p>
              Our website uses cookies and similar tracking technologies to enhance your
              experience. Cookies are small data files stored on your device that help us:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Remember your preferences and login sessions</li>
              <li>Understand how visitors use our website</li>
              <li>Measure the effectiveness of our marketing campaigns</li>
              <li>Provide a personalized experience</li>
            </ul>
            <p className="mt-4">
              We may use the following types of cookies:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Essential Cookies:</strong> Required for the website to function properly
                (e.g., authentication, security)
              </li>
              <li>
                <strong>Analytics Cookies:</strong> Help us understand website usage through
                services like Google Analytics
              </li>
              <li>
                <strong>Marketing Cookies:</strong> Used to track advertising effectiveness and
                deliver relevant ads (e.g., Google Ads)
              </li>
            </ul>
            <p className="mt-4">
              You can control cookies through your browser settings. Disabling certain cookies may
              affect the functionality of our website.
            </p>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Third-Party Services</h2>
            <p>
              We may share your information with trusted third-party service providers who assist
              us in operating our business:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Payment Processors:</strong> Clover and other payment platforms to securely
                process transactions
              </li>
              <li>
                <strong>Communication Services:</strong> Email and SMS service providers (e.g.,
                Brevo, Twilio) to send service notifications and reminders
              </li>
              <li>
                <strong>Analytics Providers:</strong> Google Analytics and similar services for
                website usage analysis
              </li>
              <li>
                <strong>Advertising Partners:</strong> Google Ads for marketing campaign management
              </li>
              <li>
                <strong>Error Monitoring:</strong> Sentry for application error tracking and
                performance monitoring
              </li>
              <li>
                <strong>Accounting Software:</strong> QuickBooks for invoicing and financial
                record-keeping
              </li>
            </ul>
            <p className="mt-4">
              These third parties are contractually obligated to use your information only for the
              purposes we specify and in accordance with applicable privacy laws.
            </p>
            <p>
              We do not sell, rent, or trade your personal information to third parties for their
              own marketing purposes.
            </p>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Security</h2>
            <p>
              We take the security of your personal information seriously and implement appropriate
              technical and organizational measures to protect it, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encryption of data in transit using SSL/TLS (HTTPS)</li>
              <li>Secure authentication with encrypted session tokens</li>
              <li>Access controls limiting employee access to personal information on a need-to-know basis</li>
              <li>Regular security assessments and monitoring</li>
              <li>Secure hosting infrastructure with industry-standard protections</li>
            </ul>
            <p className="mt-4">
              While we strive to protect your personal information, no method of transmission over
              the Internet or electronic storage is 100% secure. We cannot guarantee absolute
              security but are committed to maintaining reasonable safeguards.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to fulfill the purposes
              described in this policy, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Active service records are maintained for the duration of our business relationship</li>
              <li>Service history and inspection records may be retained for regulatory compliance (as required by TCEQ and other authorities)</li>
              <li>Financial records are retained in accordance with tax and accounting regulations</li>
              <li>Marketing preferences are retained until you opt out</li>
            </ul>
            <p className="mt-4">
              When your information is no longer needed, we will securely delete or anonymize it.
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Your Rights</h2>
            <p>
              Depending on your location, you may have the following rights regarding your personal
              information:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Access:</strong> Request a copy of the personal information we hold about
                you
              </li>
              <li>
                <strong>Correction:</strong> Request correction of inaccurate or incomplete
                personal information
              </li>
              <li>
                <strong>Deletion:</strong> Request deletion of your personal information, subject
                to legal and contractual obligations
              </li>
              <li>
                <strong>Opt-Out:</strong> Unsubscribe from marketing communications at any time
                using the "unsubscribe" link in our emails or by contacting us
              </li>
              <li>
                <strong>Data Portability:</strong> Request a copy of your data in a commonly used
                format
              </li>
            </ul>
            <p className="mt-4">
              To exercise any of these rights, please contact us using the information provided
              below.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Children's Privacy</h2>
            <p>
              Our services are not directed to individuals under the age of 18. We do not
              knowingly collect personal information from children. If we become aware that we have
              collected information from a child under 18, we will take steps to delete it
              promptly.
            </p>
          </section>

          {/* Changes to This Policy */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our
              practices, technology, legal requirements, or other factors. We will post the updated
              policy on this page with a revised "Last updated" date. We encourage you to review
              this policy periodically.
            </p>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Contact Us</h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or
              our data practices, please contact us:
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
              <span className="text-white font-medium">Privacy Policy</span>
              <Link to="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
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
