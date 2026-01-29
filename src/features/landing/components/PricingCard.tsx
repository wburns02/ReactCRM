interface PricingCardProps {
  basePrice: number;
  includedGallons: number;
  overageRate: number;
  serviceName?: string;
}

export function PricingCard({
  basePrice = 575,
  includedGallons = 1750,
  overageRate = 0.45,
  serviceName = "Septic Tank Pumping",
}: PricingCardProps) {
  return (
    <div className="bg-white border-2 border-primary/20 rounded-xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
          <span className="text-2xl">🚛</span>
        </div>
        <div>
          <h3 className="font-bold text-lg text-gray-900">{serviceName}</h3>
          <p className="text-sm text-gray-500">Standard Residential Service</p>
        </div>
      </div>

      {/* Price */}
      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-primary">${basePrice}</span>
        </div>
      </div>

      {/* Features */}
      <ul className="space-y-2 mb-4">
        <li className="flex items-center gap-2 text-gray-700">
          <svg
            className="w-5 h-5 text-green-500 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <span>Professional pump-out service</span>
        </li>
        <li className="flex items-center gap-2 text-gray-700">
          <svg
            className="w-5 h-5 text-green-500 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <span>
            Covers up to{" "}
            <strong>{includedGallons.toLocaleString()} gallons</strong>
          </span>
        </li>
        <li className="flex items-center gap-2 text-gray-700">
          <svg
            className="w-5 h-5 text-green-500 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <span>Includes locating tank lid</span>
        </li>
        <li className="flex items-center gap-2 text-gray-700">
          <svg
            className="w-5 h-5 text-green-500 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <span>Licensed & insured technicians</span>
        </li>
      </ul>

      {/* Overage note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
        <div className="flex items-start gap-2">
          <svg
            className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="text-blue-800 font-medium">Larger tanks?</p>
            <p className="text-blue-700">
              Just <strong>${overageRate.toFixed(2)}/gallon</strong> for any
              volume over {includedGallons.toLocaleString()} gallons. Our
              technician will measure on-site.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
