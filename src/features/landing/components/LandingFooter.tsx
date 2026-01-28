export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  const serviceAreas = [
    "Nacogdoches",
    "Lufkin",
    "Diboll",
    "Huntington",
    "Garrison",
    "Cushing",
    "San Augustine",
    "Center",
  ];

  return (
    <footer className="bg-gray-900 text-white">
      {/* Main footer */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company info */}
          <div>
            <h3 className="text-xl font-bold mb-4">MAC Septic Services</h3>
            <p className="text-gray-400 mb-4">
              Family-owned and operated since 1996. Providing professional
              septic services to East Central Texas.
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Licensed & Insured - TCEQ</span>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3 text-gray-400">
              <li>
                <a
                  href="tel:+19365641440"
                  className="flex items-center gap-2 hover:text-white transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  (936) 564-1440
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@macseptic.com"
                  className="flex items-center gap-2 hover:text-white transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  info@macseptic.com
                </a>
              </li>
              <li className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>
                  East Central Texas
                  <br />
                  Nacogdoches & Surrounding Areas
                </span>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Services</h3>
            <ul className="space-y-2 text-gray-400">
              <li>
                <a href="#quote" className="hover:text-white transition-colors">
                  Septic Tank Pumping
                </a>
              </li>
              <li>
                <a href="#quote" className="hover:text-white transition-colors">
                  Septic Inspection
                </a>
              </li>
              <li>
                <a href="#quote" className="hover:text-white transition-colors">
                  Repair & Maintenance
                </a>
              </li>
              <li>
                <a href="#quote" className="hover:text-white transition-colors">
                  New Installation
                </a>
              </li>
              <li>
                <a href="#quote" className="hover:text-white transition-colors">
                  Emergency Service (24/7)
                </a>
              </li>
              <li>
                <a href="#quote" className="hover:text-white transition-colors">
                  Grease Trap Cleaning
                </a>
              </li>
            </ul>
          </div>

          {/* Service Areas */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Service Areas</h3>
            <div className="grid grid-cols-2 gap-2 text-gray-400 text-sm">
              {serviceAreas.map((area) => (
                <span key={area}>{area}, TX</span>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-4">
              And surrounding communities
            </p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
            <p>
              &copy; {currentYear} MAC Septic Services. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </a>
              <a href="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
