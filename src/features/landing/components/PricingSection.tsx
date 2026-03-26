/**
 * Three-tier pricing section for septic service packages.
 *
 * Packages:
 *   - Maintenance Plan: $595 (price-lock for next pump)
 *   - Standard: $625 (includes system health check)
 *   - Real Estate: $825 (full inspection + written report + rush)
 */

const CHECK_ICON = (
  <svg className="w-5 h-5 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

interface PricingSectionProps {
  phone?: string;
  phoneTel?: string;
}

export function PricingSection({
  phone = "(615) 345-2544",
  phoneTel = "tel:+16153452544",
}: PricingSectionProps) {
  return (
    <section className="py-16 md:py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-mac-dark-blue mb-4">
            Transparent Pricing
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            No hidden fees. No surprises. Choose the package that fits your needs.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Maintenance Plan */}
          <div className="bg-white rounded-xl border-2 border-primary/30 p-6 shadow-sm hover:shadow-lg transition-shadow relative">
            <div className="absolute -top-3 left-6">
              <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                Best Value
              </span>
            </div>
            <div className="mb-4 pt-2">
              <h3 className="text-xl font-bold text-gray-900">Maintenance Plan</h3>
              <p className="text-sm text-gray-500 mt-1">Lock in your rate</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold text-primary">$595</span>
              <span className="text-gray-500 ml-1">/pump</span>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2 text-gray-700 text-sm">
                {CHECK_ICON}
                <span>Professional pump-out (up to 1,000 gal)</span>
              </li>
              <li className="flex items-start gap-2 text-gray-700 text-sm">
                {CHECK_ICON}
                <span>Full system health check</span>
              </li>
              <li className="flex items-start gap-2 text-gray-700 text-sm">
                {CHECK_ICON}
                <span><strong>Price-lock guarantee</strong> &mdash; same rate on your next pump</span>
              </li>
              <li className="flex items-start gap-2 text-gray-700 text-sm">
                {CHECK_ICON}
                <span>Scheduled reminder when you&apos;re due</span>
              </li>
              <li className="flex items-start gap-2 text-gray-700 text-sm">
                {CHECK_ICON}
                <span>Licensed &amp; insured technicians</span>
              </li>
            </ul>
            <a
              href={phoneTel}
              className="block w-full bg-primary hover:bg-primary-hover text-white text-center py-3 px-4 rounded-lg font-semibold transition-colors"
            >
              Call to Book &mdash; {phone}
            </a>
          </div>

          {/* Standard */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-lg transition-shadow">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900">Standard Pump</h3>
              <p className="text-sm text-gray-500 mt-1">One-time service</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold text-gray-900">$625</span>
              <span className="text-gray-500 ml-1">/pump</span>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2 text-gray-700 text-sm">
                {CHECK_ICON}
                <span>Professional pump-out (up to 1,000 gal)</span>
              </li>
              <li className="flex items-start gap-2 text-gray-700 text-sm">
                {CHECK_ICON}
                <span>System health check included</span>
              </li>
              <li className="flex items-start gap-2 text-gray-700 text-sm">
                {CHECK_ICON}
                <span>Tank walls, baffles, inlet/outlet inspection</span>
              </li>
              <li className="flex items-start gap-2 text-gray-700 text-sm">
                {CHECK_ICON}
                <span>Licensed &amp; insured technicians</span>
              </li>
            </ul>
            <a
              href={phoneTel}
              className="block w-full bg-gray-800 hover:bg-gray-900 text-white text-center py-3 px-4 rounded-lg font-semibold transition-colors"
            >
              Call to Book &mdash; {phone}
            </a>
          </div>

          {/* Real Estate */}
          <div className="bg-white rounded-xl border-2 border-green-300 p-6 shadow-sm hover:shadow-lg transition-shadow relative">
            <div className="absolute -top-3 right-6">
              <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                Realtors
              </span>
            </div>
            <div className="mb-4 pt-2">
              <h3 className="text-xl font-bold text-gray-900">Real Estate Package</h3>
              <p className="text-sm text-gray-500 mt-1">Full inspection for closings</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold text-green-700">$825</span>
              <span className="text-gray-500 ml-1">/inspection</span>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2 text-gray-700 text-sm">
                {CHECK_ICON}
                <span>Full pump-out (up to 1,000 gal)</span>
              </li>
              <li className="flex items-start gap-2 text-gray-700 text-sm">
                {CHECK_ICON}
                <span>Complete system inspection</span>
              </li>
              <li className="flex items-start gap-2 text-gray-700 text-sm">
                {CHECK_ICON}
                <span><strong>Written inspection report</strong> for buyer/lender</span>
              </li>
              <li className="flex items-start gap-2 text-gray-700 text-sm">
                {CHECK_ICON}
                <span><strong>48-hour rush</strong> turnaround</span>
              </li>
              <li className="flex items-start gap-2 text-gray-700 text-sm">
                {CHECK_ICON}
                <span>12-month inspection warranty</span>
              </li>
            </ul>
            <a
              href={phoneTel}
              className="block w-full bg-green-600 hover:bg-green-700 text-white text-center py-3 px-4 rounded-lg font-semibold transition-colors"
            >
              Call to Book &mdash; {phone}
            </a>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-8">
          Tanks over 1,000 gallons: $0.45/gallon for additional volume. Technician measures on-site.
        </p>
      </div>
    </section>
  );
}
