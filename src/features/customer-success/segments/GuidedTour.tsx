/**
 * Guided Tour Component
 *
 * A friendly, step-by-step tour for first-time users.
 * Uses simple tooltips to explain the AI Guide features.
 */

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils.ts";

interface TourStep {
  id: string;
  title: string;
  description: string;
  emoji: string;
  target?: string; // CSS selector for highlighting
  position: "top" | "bottom" | "left" | "right" | "center";
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome! Let me show you around",
    description:
      "This is where you find groups of customers. It's like having a super-smart assistant who knows all your customers!",
    emoji: "👋",
    position: "center",
  },
  {
    id: "search",
    title: "Just type what you need",
    description:
      'Ask anything in plain English - like talking to a friend. Try "Show me customers who haven\'t ordered in a month" or "Who are my VIP customers?"',
    emoji: "💬",
    target: '[data-tour="search-box"]',
    position: "bottom",
  },
  {
    id: "quick-questions",
    title: "Or use these shortcuts",
    description:
      "Not sure what to ask? These quick buttons cover the most common questions. Just click one and I'll find those customers for you!",
    emoji: "⚡",
    target: '[data-tour="quick-questions"]',
    position: "top",
  },
  {
    id: "ai-magic",
    title: "AI does the hard work",
    description:
      "I understand what you're looking for and find the right customers automatically. No complicated filters or technical stuff needed!",
    emoji: "✨",
    position: "center",
  },
  {
    id: "actions",
    title: "Then take action with one click",
    description:
      "Once I find your customers, you can email them, call them, book service, or save the group for later. It's that easy!",
    emoji: "🚀",
    position: "center",
  },
];

interface GuidedTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function GuidedTour({ onComplete, onSkip }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ top: "50%", left: "50%" });

  const step = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  // Position the tooltip near the target element
  useEffect(() => {
    if (step.target && step.position !== "center") {
      const target = document.querySelector(step.target);
      if (target) {
        const rect = target.getBoundingClientRect();
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollLeft =
          window.scrollX || document.documentElement.scrollLeft;

        let top: string;
        let left: string;

        switch (step.position) {
          case "bottom":
            top = `${rect.bottom + scrollTop + 20}px`;
            left = `${rect.left + scrollLeft + rect.width / 2}px`;
            break;
          case "top":
            top = `${rect.top + scrollTop - 20}px`;
            left = `${rect.left + scrollLeft + rect.width / 2}px`;
            break;
          case "left":
            top = `${rect.top + scrollTop + rect.height / 2}px`;
            left = `${rect.left + scrollLeft - 20}px`;
            break;
          case "right":
            top = `${rect.top + scrollTop + rect.height / 2}px`;
            left = `${rect.right + scrollLeft + 20}px`;
            break;
          default:
            top = "50%";
            left = "50%";
        }

        setPosition({ top, left });

        // Add highlight to target
        target.classList.add(
          "ring-4",
          "ring-primary",
          "ring-offset-4",
          "relative",
          "z-50",
        );

        return () => {
          target.classList.remove(
            "ring-4",
            "ring-primary",
            "ring-offset-4",
            "relative",
            "z-50",
          );
        };
      }
    } else {
      setPosition({ top: "50%", left: "50%" });
    }
  }, [step]);

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleDotClick = (index: number) => {
    setCurrentStep(index);
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
        onClick={onSkip}
      />

      {/* Tooltip */}
      <div
        className={cn(
          "fixed z-50 transform transition-all duration-300",
          step.position === "center"
            ? "-translate-x-1/2 -translate-y-1/2"
            : step.position === "bottom"
              ? "-translate-x-1/2"
              : step.position === "top"
                ? "-translate-x-1/2 -translate-y-full"
                : step.position === "left"
                  ? "-translate-x-full -translate-y-1/2"
                  : "-translate-y-1/2",
        )}
        style={{
          top: position.top,
          left: position.left,
        }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm border border-gray-200 dark:border-gray-700">
          {/* Emoji & Title */}
          <div className="text-center mb-4">
            <span className="text-4xl block mb-2">{step.emoji}</span>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {step.title}
            </h3>
          </div>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-300 text-center mb-6 leading-relaxed">
            {step.description}
          </p>

          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mb-4">
            {TOUR_STEPS.map((_, index) => (
              <button
                key={index}
                onClick={() => handleDotClick(index)}
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all",
                  index === currentStep
                    ? "bg-primary w-6"
                    : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400",
                )}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={onSkip}
              className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Skip tour
            </button>
            <div className="flex gap-2">
              {!isFirstStep && (
                <button
                  onClick={handlePrev}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200",
                    "hover:bg-gray-200 dark:hover:bg-gray-600",
                  )}
                >
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  "bg-primary text-white hover:bg-primary-hover",
                )}
              >
                {isLastStep ? "Got it! Let's go" : "Next"}
              </button>
            </div>
          </div>
        </div>

        {/* Arrow pointer - only for positioned tooltips */}
        {step.position !== "center" && (
          <div
            className={cn(
              "absolute w-4 h-4 bg-white dark:bg-gray-800 transform rotate-45",
              "border border-gray-200 dark:border-gray-700",
              step.position === "bottom" &&
                "-top-2 left-1/2 -translate-x-1/2 border-b-0 border-r-0",
              step.position === "top" &&
                "-bottom-2 left-1/2 -translate-x-1/2 border-t-0 border-l-0",
              step.position === "left" &&
                "top-1/2 -right-2 -translate-y-1/2 border-l-0 border-t-0",
              step.position === "right" &&
                "top-1/2 -left-2 -translate-y-1/2 border-r-0 border-b-0",
            )}
          />
        )}
      </div>
    </>
  );
}

export default GuidedTour;
