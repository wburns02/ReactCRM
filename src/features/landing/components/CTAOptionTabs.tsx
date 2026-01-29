import { Zap, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export type CTAOption = "book" | "quote";

interface CTAOptionTabsProps {
  activeOption: CTAOption;
  onChange: (option: CTAOption) => void;
}

export function CTAOptionTabs({ activeOption, onChange }: CTAOptionTabsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-6" role="tablist">
      {/* Book Now Tab */}
      <button
        type="button"
        role="tab"
        aria-selected={activeOption === "book"}
        id="tab-book"
        aria-controls="panel-book"
        onClick={() => onChange("book")}
        className={cn(
          "relative flex flex-col items-center p-4 rounded-xl border-2 transition-all",
          activeOption === "book"
            ? "border-green-500 bg-green-50 shadow-lg scale-[1.02]"
            : "border-gray-200 hover:border-green-300 hover:bg-green-50/50",
        )}
      >
        {/* Badge */}
        <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold shadow-sm">
          INSTANT
        </span>
        <Zap className="w-6 h-6 text-green-600 mb-1" />
        <span className="font-semibold text-gray-900">Book & Pay Now</span>
        <span className="text-sm text-gray-500">Skip the Wait</span>
      </button>

      {/* Get Quote Tab */}
      <button
        type="button"
        role="tab"
        aria-selected={activeOption === "quote"}
        id="tab-quote"
        aria-controls="panel-quote"
        onClick={() => onChange("quote")}
        className={cn(
          "flex flex-col items-center p-4 rounded-xl border-2 transition-all",
          activeOption === "quote"
            ? "border-blue-500 bg-blue-50 shadow-lg scale-[1.02]"
            : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50",
        )}
      >
        <MessageSquare className="w-6 h-6 text-blue-600 mb-1" />
        <span className="font-semibold text-gray-900">Get Free Quote</span>
        <span className="text-sm text-gray-500">No Obligation</span>
      </button>
    </div>
  );
}
