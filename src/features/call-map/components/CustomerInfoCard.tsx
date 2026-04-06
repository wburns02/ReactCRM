interface CustomerInfoCardProps {
  customerId: string;
  addressText: string;
}

export function CustomerInfoCard({ customerId, addressText }: CustomerInfoCardProps) {
  return (
    <div className="rounded-md border border-indigo-200 bg-indigo-50 p-2">
      <div className="text-xs font-medium text-indigo-700">Existing Customer</div>
      <div className="text-sm text-indigo-900">{addressText}</div>
      <a
        href={`/customers/${customerId}`}
        className="text-xs text-indigo-600 underline hover:text-indigo-800"
      >
        View profile →
      </a>
    </div>
  );
}
