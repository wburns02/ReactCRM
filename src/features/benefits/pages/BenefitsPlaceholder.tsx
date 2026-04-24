import { Link } from "react-router-dom";
import { Clock } from "lucide-react";

import { Card } from "@/components/ui/Card";


export function BenefitsPlaceholder({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
        <Link
          to="/benefits"
          className="text-sm text-text-secondary hover:text-text-primary"
        >
          ← Benefits overview
        </Link>
      </div>
      <Card className="mt-6">
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-violet-500/10 text-violet-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div className="text-base font-semibold text-text-primary">
            Coming soon
          </div>
          <p className="text-sm text-text-secondary max-w-md">
            {description ??
              "This section of Benefits is next on the roadmap. In the meantime, head to Enrollments for the live roster, history, upcoming events, and EOI requests."}
          </p>
          <Link
            to="/benefits/enrollments"
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7b2cbf] text-white text-sm hover:bg-[#5a189a]"
          >
            Go to Enrollments
          </Link>
        </div>
      </Card>
    </div>
  );
}
