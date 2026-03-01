import { useState, useCallback } from "react";
import { aiApi } from "@/api/ai";

const MIN_TRANSCRIPT_WORDS = 50;

const KEYWORD_PATTERNS: { keyword: RegExp; bullet: string }[] = [
  { keyword: /pric(e|ing|es)/i, bullet: "Discussed pricing" },
  { keyword: /competi(tor|tion|tive)/i, bullet: "Mentioned competitor" },
  { keyword: /inspect(ion|ed|ing)/i, bullet: "Inspection discussed" },
  { keyword: /contract/i, bullet: "Contract discussed" },
  { keyword: /pump(ing|ed|out)?/i, bullet: "Pumping service mentioned" },
  { keyword: /maintenance/i, bullet: "Maintenance discussed" },
  { keyword: /emergency/i, bullet: "Emergency situation" },
  { keyword: /schedul(e|ed|ing)/i, bullet: "Scheduling discussed" },
  { keyword: /aerobic/i, bullet: "Aerobic system topic" },
  { keyword: /conventional/i, bullet: "Conventional system topic" },
  { keyword: /sell(ing)?|buy(ing)?|real\s*estate/i, bullet: "Property sale/purchase context" },
  { keyword: /call\s*back|follow\s*up/i, bullet: "Follow-up requested" },
];

function localKeywordExtract(transcript: string): string[] {
  const bullets: string[] = [];
  for (const { keyword, bullet } of KEYWORD_PATTERNS) {
    if (keyword.test(transcript) && !bullets.includes(bullet)) {
      bullets.push(bullet);
    }
  }
  return bullets.slice(0, 3);
}

export function useAutoSummary() {
  const [summary, setSummary] = useState<string[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = useCallback(
    async (transcript: string, contactName: string) => {
      const wordCount = transcript.trim().split(/\s+/).length;
      if (wordCount < MIN_TRANSCRIPT_WORDS) return;

      setIsGenerating(true);
      setError(null);

      try {
        const result = await aiApi.generateContent({
          type: "note",
          context: {
            transcript,
            contactName,
            instruction:
              "Summarize this sales call transcript in 2-3 concise bullet points. Focus on: what the customer needs, any objections raised, and agreed next steps. Keep each bullet under 15 words.",
          },
          tone: "professional",
        });

        // Parse bullet points from AI response
        const bullets = result.content
          .split("\n")
          .map((line) => line.replace(/^[-*•]\s*/, "").trim())
          .filter((line) => line.length > 0)
          .slice(0, 3);

        if (bullets.length > 0) {
          setSummary(bullets);
        } else {
          // Fallback to local extraction
          const local = localKeywordExtract(transcript);
          setSummary(local.length > 0 ? local : null);
        }
      } catch {
        // Graceful fallback — AI unavailable
        const local = localKeywordExtract(transcript);
        setSummary(local.length > 0 ? local : null);
        setError("AI unavailable — using keyword extraction");
      } finally {
        setIsGenerating(false);
      }
    },
    [],
  );

  const clearSummary = useCallback(() => {
    setSummary(null);
    setError(null);
  }, []);

  return { summary, isGenerating, error, generateSummary, clearSummary };
}
