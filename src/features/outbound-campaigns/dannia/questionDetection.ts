import {
  searchKnowledgeBase,
  type KBCategory,
  type KBEntry,
} from "./macSepticKnowledgeBase";

/**
 * Detects customer questions from live transcription text
 * and matches them to knowledge base entries.
 */

export interface DetectedQuestion {
  id: string;
  text: string;
  category: KBCategory;
  confidence: number; // 0-1
  timestamp: number;
  matchedEntry?: KBEntry;
  answer?: string;
}

interface DetectionPattern {
  pattern: RegExp;
  category: KBCategory;
  confidence: number;
}

/**
 * Patterns that indicate a customer is asking a question or raising a topic.
 */
const DETECTION_PATTERNS: DetectionPattern[] = [
  // Pricing questions
  { pattern: /how much|what does it cost|what.*price|what.*charge|how expensive|what.*pay/i, category: "pricing", confidence: 0.9 },
  { pattern: /afford|budget|payment|financ|cheaper|discount/i, category: "pricing", confidence: 0.8 },
  { pattern: /free.*inspect|no.*cost|no.*charge|compliment/i, category: "pricing", confidence: 0.85 },

  // Technical questions
  { pattern: /how often|when should|maintenance|how.*maintain|schedule/i, category: "technical", confidence: 0.85 },
  { pattern: /what's the difference|aerobic|conventional|type.*system/i, category: "technical", confidence: 0.85 },
  { pattern: /drain.*field|leach|lateral/i, category: "technical", confidence: 0.9 },
  { pattern: /how long.*last|lifespan|life.*expect/i, category: "technical", confidence: 0.8 },
  { pattern: /sign.*problem|warning|fail|trouble|symptom/i, category: "technical", confidence: 0.85 },
  { pattern: /tank.*size|how.*big|gallon|capacity/i, category: "technical", confidence: 0.8 },
  { pattern: /flush|garbage.*dispos|chemical|bleach/i, category: "technical", confidence: 0.75 },

  // Company questions
  { pattern: /who.*are.*you|about.*company|tell.*about|mac.*septic/i, category: "company", confidence: 0.8 },
  { pattern: /new.*company|never heard|how long.*business/i, category: "company", confidence: 0.85 },
  { pattern: /certif|licens|qualif|insur/i, category: "company", confidence: 0.85 },
  { pattern: /guarantee|warranty|stand.*behind/i, category: "company", confidence: 0.85 },
  { pattern: /service.*area|how far|where.*located/i, category: "company", confidence: 0.8 },
  { pattern: /hours|when.*open|available/i, category: "company", confidence: 0.75 },

  // Competitive questions
  { pattern: /why.*switch|why.*change|current.*provider|already.*have/i, category: "competitive", confidence: 0.85 },
  { pattern: /what.*different|why.*better|what.*special|unique/i, category: "competitive", confidence: 0.85 },
  { pattern: /review|rating|reference|recommend/i, category: "competitive", confidence: 0.8 },
  { pattern: /competitor|other.*company|someone.*else/i, category: "competitive", confidence: 0.8 },

  // Regulatory
  { pattern: /tceq|regulation|requirement|law|code|permit/i, category: "regulatory", confidence: 0.85 },
  { pattern: /sell.*home|real.*estate|property.*transfer/i, category: "regulatory", confidence: 0.9 },

  // Emergency
  { pattern: /emergency|urgent|back.*up|overflow|smell|odor|sewage/i, category: "emergency", confidence: 0.95 },
  { pattern: /help|now|immediate|right away|asap/i, category: "emergency", confidence: 0.6 },

  // General question indicators
  { pattern: /do you|can you|are you|will you|would you/i, category: "company", confidence: 0.5 },
  { pattern: /what about|what if|is it possible/i, category: "service", confidence: 0.5 },
];

/**
 * Detect questions in a transcript segment.
 * Returns detected questions sorted by confidence (highest first).
 */
export function detectQuestions(
  transcript: string,
  existingIds: Set<string> = new Set(),
): DetectedQuestion[] {
  if (!transcript.trim()) return [];

  const detected: DetectedQuestion[] = [];
  const sentences = splitIntoSentences(transcript);

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length < 5) continue;

    // Find matching patterns
    let bestMatch: DetectionPattern | null = null;
    let bestConfidence = 0;

    for (const dp of DETECTION_PATTERNS) {
      if (dp.pattern.test(trimmed) && dp.confidence > bestConfidence) {
        bestMatch = dp;
        bestConfidence = dp.confidence;
      }
    }

    if (bestMatch && bestConfidence >= 0.5) {
      // Generate stable ID from sentence content to avoid duplicates
      const id = `q-${hashString(trimmed)}`;
      if (existingIds.has(id)) continue;

      // Try to match with knowledge base
      const kbResults = searchKnowledgeBase(trimmed, 1);
      const matchedEntry = kbResults.length > 0 ? kbResults[0].entry : undefined;

      detected.push({
        id,
        text: trimmed,
        category: bestMatch.category,
        confidence: bestConfidence,
        timestamp: Date.now(),
        matchedEntry,
        answer: matchedEntry?.answer,
      });
    }
  }

  return detected.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Match a specific question to knowledge base and get the best answer.
 */
export function matchToKnowledgeBase(
  question: string,
): { entry: KBEntry; score: number } | null {
  const results = searchKnowledgeBase(question, 1);
  return results.length > 0 ? results[0] : null;
}

/**
 * Split text into rough sentences for analysis.
 */
function splitIntoSentences(text: string): string[] {
  // Split on sentence boundaries and question marks
  return text
    .split(/(?<=[.!?])\s+|(?<=\?)/g)
    .filter((s) => s.trim().length > 0);
}

/**
 * Simple string hash for generating stable IDs.
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36);
}
