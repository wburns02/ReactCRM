import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { OnboardingData } from "../useOnboarding";

export interface CompletionStepProps {
  data: OnboardingData;
  onComplete: () => void;
}

/**
 * Step 6: Completion
 * Summary of setup and next steps
 */
export function CompletionStep({ data, onComplete }: CompletionStepProps) {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    onComplete();
    navigate("/dashboard");
  };

  // Calculate summary stats
  const stats = [
    {
      label: "Company",
      value: data.company.name || "Not set",
      icon: "Building",
    },
    {
      label: "Customers",
      value: data.customers.length,
      icon: "Users",
    },
    {
      label: "Technicians",
      value: data.technicians.length,
      icon: "Wrench",
    },
    {
      label: "Services",
      value: data.services.length,
      icon: "Clipboard",
    },
    {
      label: "Integrations",
      value: Object.values(data.integrations).filter(Boolean).length,
      icon: "Link",
    },
  ];

  const nextSteps = [
    {
      title: "Create your first work order",
      description: "Schedule a service call for a customer",
      link: "/work-orders",
      linkText: "Go to Work Orders",
    },
    {
      title: "Set up your schedule",
      description: "View and manage your team calendar",
      link: "/schedule",
      linkText: "Open Schedule",
    },
    {
      title: "Review your settings",
      description: "Customize notifications and preferences",
      link: "/admin",
      linkText: "Admin Settings",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/10 mb-4">
          <svg
            className="w-10 h-10 text-success"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-text-primary mb-2">
          You're all set!
        </h2>
        <p className="text-text-secondary text-lg">
          Your CRM is ready to use. Here's a summary of your setup.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4 text-center">
            <div className="text-2xl font-bold text-primary mb-1">
              {typeof stat.value === "number" ? stat.value : "-"}
            </div>
            <div className="text-sm text-text-secondary">{stat.label}</div>
          </Card>
        ))}
      </div>

      {/* Company Info */}
      {data.company.name && (
        <Card className="p-6 mb-8">
          <div className="flex items-center gap-4">
            {data.company.logo ? (
              <img
                src={data.company.logo}
                alt={data.company.name}
                className="w-16 h-16 rounded-lg object-contain border border-border"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">
                  {data.company.name.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <h3 className="text-xl font-semibold text-text-primary">
                {data.company.name}
              </h3>
              <p className="text-text-muted">
                {[
                  data.company.address,
                  data.company.city,
                  data.company.state,
                  data.company.zipCode,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {data.company.phone && (
                <p className="text-text-secondary">{data.company.phone}</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Next Steps */}
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Recommended Next Steps
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {nextSteps.map((step) => (
            <Card key={step.title} className="p-4">
              <h4 className="font-medium text-text-primary mb-1">
                {step.title}
              </h4>
              <p className="text-sm text-text-muted mb-3">{step.description}</p>
              <button
                type="button"
                onClick={() => {
                  onComplete();
                  navigate(step.link);
                }}
                className="text-sm text-primary hover:underline"
              >
                {step.linkText} &rarr;
              </button>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA Button */}
      <div className="pt-8 mt-8 border-t border-border flex justify-center">
        <Button size="lg" onClick={handleGetStarted}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
