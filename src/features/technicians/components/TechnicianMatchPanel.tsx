import { useState, useEffect } from "react";
import {
  useTechnicianMatch,
  type TechnicianMatch,
} from "@/api/hooks/useTechnicianAI";
import { Button } from "@/components/ui/Button";

interface TechnicianMatchPanelProps {
  jobType: string;
  location?: { lat?: number; lng?: number; address?: string };
  requiredSkills?: string[];
  customerId?: string;
  urgency?: "low" | "normal" | "high" | "emergency";
  preferredTechnicianId?: string;
  onSelectTechnician?: (technicianId: string, technicianName: string) => void;
}

/**
 * AI-powered technician matching panel
 * Recommends the best technician based on skills, availability, and location
 */
export function TechnicianMatchPanel({
  jobType,
  location,
  requiredSkills,
  customerId,
  urgency = "normal",
  preferredTechnicianId,
  onSelectTechnician,
}: TechnicianMatchPanelProps) {
  const [showPanel, setShowPanel] = useState(false);
  const matchMutation = useTechnicianMatch();

  // Auto-find matches when panel opens
  useEffect(() => {
    if (showPanel && !matchMutation.data) {
      matchMutation.mutate({
        jobType,
        location: location || {},
        requiredSkills,
        customerId,
        urgency,
        preferredTechnicianId,
      });
    }
  }, [showPanel]);

  const handleRefresh = () => {
    matchMutation.mutate({
      jobType,
      location: location || {},
      requiredSkills,
      customerId,
      urgency,
      preferredTechnicianId,
    });
  };

  const handleSelect = (match: TechnicianMatch) => {
    if (onSelectTechnician) {
      onSelectTechnician(match.technician_id, match.technician_name);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-400";
    if (score >= 70) return "text-yellow-400";
    return "text-orange-400";
  };

  const getProficiencyColor = (proficiency: string) => {
    switch (proficiency) {
      case "expert":
        return "bg-green-500/20 text-green-400";
      case "proficient":
        return "bg-blue-500/20 text-blue-400";
      case "basic":
        return "bg-yellow-500/20 text-yellow-400";
      default:
        return "bg-red-500/20 text-red-400";
    }
  };

  const getAvailabilityColor = (isAvailable: boolean) => {
    return isAvailable ? "text-green-400" : "text-yellow-400";
  };

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="flex items-center gap-2 text-sm text-purple-500 hover:text-purple-400 transition-colors"
      >
        <span>✨</span>
        <span>AI Technician Matching</span>
      </button>
    );
  }

  const data = matchMutation.data;

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h4 className="font-medium text-text-primary">AI Technician Match</h4>
        </div>
        <button
          onClick={() => setShowPanel(false)}
          className="text-text-muted hover:text-text-primary text-sm"
        >
          Close
        </button>
      </div>

      {matchMutation.isPending && (
        <div className="flex items-center gap-2 text-text-secondary py-4">
          <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full" />
          <span className="text-sm">Finding best technician matches...</span>
        </div>
      )}

      {data && !matchMutation.isPending && (
        <div className="space-y-4">
          {/* Analysis Summary */}
          <div className="bg-bg-card border border-border rounded-lg p-3">
            <p className="text-sm text-text-secondary">{data.analysis}</p>
          </div>

          {/* Best Match Highlight */}
          {data.best_match && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-400">
                  Recommended
                </span>
                <span
                  className={`text-lg font-bold ${getScoreColor(data.best_match.match_score)}`}
                >
                  {data.best_match.match_score}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-text-primary">
                    {data.best_match.technician_name}
                  </span>
                  <p className="text-xs text-text-muted">
                    {data.best_match.distance_miles} mi away •{" "}
                    {data.best_match.estimated_arrival}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSelect(data.best_match!)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Assign
                </Button>
              </div>
            </div>
          )}

          {/* All Matches */}
          <div>
            <span className="text-xs text-text-muted block mb-2">
              All Matches
            </span>
            <div className="space-y-2">
              {data.matches.map((match) => (
                <div
                  key={match.technician_id}
                  className="bg-bg-card border border-border rounded-lg p-3"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">
                          {match.technician_name}
                        </span>
                        <span
                          className={`text-sm font-bold ${getScoreColor(match.match_score)}`}
                        >
                          {match.match_score}%
                        </span>
                      </div>
                      <p className="text-xs text-text-muted">
                        {match.distance_miles} mi • {match.estimated_arrival} •{" "}
                        <span
                          className={getAvailabilityColor(
                            match.availability.is_available,
                          )}
                        >
                          {match.availability.is_available
                            ? "Available now"
                            : `Available ${match.availability.next_available}`}
                        </span>
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleSelect(match)}
                    >
                      Assign
                    </Button>
                  </div>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {match.skills_match
                      .filter((s) => s.has_skill)
                      .map((skill, i) => (
                        <span
                          key={i}
                          className={`text-xs px-1.5 py-0.5 rounded ${getProficiencyColor(skill.proficiency)}`}
                        >
                          {skill.skill}
                          {skill.required && " *"}
                        </span>
                      ))}
                  </div>

                  {/* Customer History */}
                  {match.customer_history.previous_visits > 0 && (
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <span>
                        {match.customer_history.previous_visits} previous visit
                        {match.customer_history.previous_visits !== 1
                          ? "s"
                          : ""}
                      </span>
                      <span>•</span>
                      <span>
                        {match.customer_history.average_rating}/5 rating
                      </span>
                      {match.customer_history.customer_preference && (
                        <>
                          <span>•</span>
                          <span className="text-green-400">
                            Customer preferred
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Recommendation */}
                  <p className="text-xs text-purple-400 mt-2">
                    → {match.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Factors Considered */}
          <div className="text-xs text-text-muted">
            <span className="block mb-1">Factors considered:</span>
            <div className="flex flex-wrap gap-1">
              {data.factors_considered.map((factor, i) => (
                <span key={i} className="px-1.5 py-0.5 bg-bg-tertiary rounded">
                  {factor}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <Button
        size="sm"
        variant="secondary"
        onClick={handleRefresh}
        disabled={matchMutation.isPending}
        className="w-full mt-4"
      >
        Refresh Matches
      </Button>
    </div>
  );
}
