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
 * Patterns that match agent speech — sentences matching these are skipped
 * so only caller questions trigger suggestions.
 */
const AGENT_EXCLUSION_PATTERNS: RegExp[] = [
  // Agent introductions / outbound phrasing
  /\b(my name is|i'm calling|i wanted to|i'd like to|this is .+ from|calling from)\b/i,
  /\b(hi .+ this is|hello .+ this is|good (morning|afternoon|evening))\b/i,
  // Agent offering / pitching / explaining
  /\b(let me tell you|i can explain|we offer|our price|we charge)\b/i,
  /\b(we provide|we specialize|we can schedule|i'll send you|we can help)\b/i,
  /\b(what we do is|the way it works|the reason i'm calling|i'm reaching out)\b/i,
  /\b(we also|we actually|we currently|we normally|we typically|we usually)\b/i,
  // Agent selling / pitching Mac Septic
  /\b(mac septic|our company|our team|our technicians|we've been)\b/i,
  /\b(free inspection|complimentary|no obligation|no cost to you)\b/i,
  /\b(we'd love to|we would love|i'd love to|happy to help|glad to)\b/i,
  // Agent confirmations / scheduling
  /\b(i'll go ahead|let me get that|i'll put you down|we'll have someone)\b/i,
  /\b(i can set that up|let me schedule|how about|does .+ work for you)\b/i,
  /\b(i'll make a note|i'll send you|i'll email you|i'll text you)\b/i,
  // Agent wrap-up / pleasantries
  /\b(thank you for your time|have a great|have a good|take care|you too)\b/i,
  /\b(is there anything else|that's all i needed|appreciate your time)\b/i,
  /\b(sounds good|perfect|great|absolutely|of course|no problem|you're welcome)\b/i,
  // First-person agent statements (I/we + verb)
  /\b(i understand|i see|i hear you|i know|i appreciate|i wanted)\b/i,
  /\b(we handle|we take care|we service|we cover|we do|we get)\b/i,
];

/**
 * Returns true if the sentence looks like agent speech (not a caller question).
 */
export function isAgentSpeech(sentence: string): boolean {
  return AGENT_EXCLUSION_PATTERNS.some((p) => p.test(sentence));
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

  // Emergency / Signs of trouble
  { pattern: /emergency|urgent|back.*up|overflow|smell|odor|sewage/i, category: "emergency", confidence: 0.95 },
  { pattern: /help|now|immediate|right away|asap/i, category: "emergency", confidence: 0.6 },
  { pattern: /slow.*drain|drain.*slow|gurgl|bubbl|standing.*water|soggy/i, category: "emergency", confidence: 0.85 },
  { pattern: /green.*grass|lush.*grass|wet.*spot|puddle.*yard/i, category: "emergency", confidence: 0.8 },
  { pattern: /well.*water|contamina|drinking.*water|e.*coli|nitrate/i, category: "emergency", confidence: 0.9 },

  // Installation & replacement
  { pattern: /install|new.*system|replace.*system|perc.*test|percolat/i, category: "service", confidence: 0.85 },
  { pattern: /tear.*up.*yard|excavat|dig.*up|how long.*install/i, category: "service", confidence: 0.8 },
  { pattern: /riser|lid|locate.*tank|find.*tank|where.*tank/i, category: "service", confidence: 0.8 },
  { pattern: /repair.*or.*replace|worth.*fix|need.*new/i, category: "service", confidence: 0.85 },

  // Maintenance specifics
  { pattern: /garbage.*dispos|rid[\s-]?x|additive|enzyme|treatment/i, category: "technical", confidence: 0.8 },
  { pattern: /laundry|wash.*machine|detergent|loads/i, category: "technical", confidence: 0.75 },
  { pattern: /plant.*over|tree.*root|garden.*over|drive.*over|park.*on/i, category: "technical", confidence: 0.8 },
  { pattern: /never.*pump|first.*time|been.*years|don't.*know.*when/i, category: "technical", confidence: 0.85 },
  { pattern: /insurance|cover|homeowner.*policy|claim/i, category: "pricing", confidence: 0.85 },

  // Environmental
  { pattern: /health.*hazard|danger|toxic|safe.*breathe|gas|fume/i, category: "emergency", confidence: 0.85 },
  { pattern: /pollut|lake|river|stream|environment|eco/i, category: "emergency", confidence: 0.75 },

  // System types
  { pattern: /mound.*system|sand.*mound|raised|what.*type.*have/i, category: "technical", confidence: 0.85 },
  { pattern: /effluent.*filter|outlet.*filter|baffle.*filter/i, category: "technical", confidence: 0.8 },
  { pattern: /city.*sewer|connect.*sewer|municipal|hook.*up/i, category: "technical", confidence: 0.8 },
  { pattern: /how.*work|how.*septic.*work|explain|basics|what.*is.*septic/i, category: "technical", confidence: 0.75 },

  // Regulations
  { pattern: /diy|do.*it.*myself|need.*licensed|contractor|handyman/i, category: "regulatory", confidence: 0.8 },
  { pattern: /fail.*inspect|violation|fine|non.*compliant|county.*inspect/i, category: "regulatory", confidence: 0.85 },

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

    // Skip agent speech so only caller questions trigger suggestions
    if (isAgentSpeech(trimmed)) continue;

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
export function splitIntoSentences(text: string): string[] {
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
