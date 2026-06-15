import { ai, safetySettings } from "../lib/gemini";
import { generateEmbedding } from "../lib/embeddings";
import { AgentStateType, NodeMetrics, Topic, TopicCandidate } from "../types";

interface ScoredCandidate {
  title: string;
  novelty: number;
  specificity: number;
  surprise: number;
  mechanism: number;
  rabbitHolePotential: number;
  primaryQuestion: string;
  winningCandidateReason: string;
}

export async function curiosityScorerAgent(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const startTime = Date.now();
  const signal = state.signal;

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const candidates = state.candidates || [];
  if (candidates.length === 0) {
    console.warn("⚠️ [Curiosity Scorer] No candidates found in state.");
    return { dedupPassed: false };
  }

  console.log(`🔍 [Curiosity Scorer] Evaluating ${candidates.length} topic candidates...`);

  const model = state.userSettings?.model || "gemini-3.1-flash-lite";
  const interests = state.interests || [];

  const prompt = `You are a Curiosity Scoring Agent. Evaluate the following topic candidates for curiosity, novelty, and engagement.

Candidates:
${JSON.stringify(candidates, null, 2)}

For each candidate, score the following metrics from 0 to 10:
1. novelty: Have most people heard this before? (0 = extremely common/familiar, 10 = completely novel/unheard of)
2. specificity: Is it highly specific and concrete? (Bad/Low: "History of Bread"; Good/High: "The Accident That Made Sourdough Possible")
3. surprise: Would someone read the title/angle and say "Wait, really?"
4. mechanism: Does the topic promise a clear explanation of 'how', 'why', 'what caused', or 'what changed'?
5. rabbitHolePotential: Does the topic naturally branch into multiple fascinating follow-up topics?

Additionally, determine:
- primaryQuestion: The core question that this candidate topic/angle seeks to answer.
- winningCandidateReason: A brief, 1-2 sentence reason explaining why this candidate is a strong curiosity hook.

Return ONLY a JSON array of scored candidates matching this schema (do not include overallScore):
[
  {
    "title": "Exact title of the candidate",
    "novelty": number,
    "specificity": number,
    "surprise": number,
    "mechanism": number,
    "rabbitHolePotential": number,
    "primaryQuestion": "string",
    "winningCandidateReason": "string"
  }
]`;

  let scoredList: ScoredCandidate[] = [];
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    const result = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        safetySettings: safetySettings as any,
        responseMimeType: "application/json",
        responseSchema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              novelty: { type: "integer" },
              specificity: { type: "integer" },
              surprise: { type: "integer" },
              mechanism: { type: "integer" },
              rabbitHolePotential: { type: "integer" },
              primaryQuestion: { type: "string" },
              winningCandidateReason: { type: "string" }
            },
            required: ["title", "novelty", "specificity", "surprise", "mechanism", "rabbitHolePotential", "primaryQuestion", "winningCandidateReason"]
          }
        }
      }
    });

    const text = result.text?.replace(/```json|```/g, "").trim();
    if (text) {
      scoredList = JSON.parse(text);
    }
    if (result.usageMetadata) {
      inputTokens = result.usageMetadata.promptTokenCount || 0;
      outputTokens = result.usageMetadata.candidatesTokenCount || 0;
    }
  } catch (err) {
    console.warn("⚠️ [Curiosity Scorer] LLM scoring failed:", err);
  }

  // Calculate Hybrid Scores
  const curiosityTriggers = [
    "why", "how", "secret", "accident", "discovered", "defeats", 
    "crashes", "unexpected", "force", "gravity", "mystery", "uncovered",
    "changed", "caused", "train", "nobel", "prize", "scotch", "tape"
  ];

  const processedCandidates = candidates.map(candidate => {
    const scored = scoredList.find(s => s.title.toLowerCase() === candidate.title.toLowerCase()) || {
      title: candidate.title,
      novelty: 5,
      specificity: 5,
      surprise: 5,
      mechanism: 5,
      rabbitHolePotential: 5,
      primaryQuestion: `How does ${candidate.title} work?`,
      winningCandidateReason: "Selected candidate from standard fallback values."
    };

    const baseScore = scored.novelty + scored.specificity + scored.surprise + scored.mechanism + scored.rabbitHolePotential; // max 50

    // 1. Interest Match Bonus: +2 if category matches any user interest
    const categoryLower = candidate.category?.toLowerCase() || "";
    const matchesInterest = interests.some(interest =>
      categoryLower.includes(interest.toLowerCase()) ||
      interest.toLowerCase().includes(categoryLower)
    );
    const interestBonus = matchesInterest ? 2 : 0;

    // 2. Curiosity Word Bonus: +2 if title or angle contains curiosity triggers
    const titleLower = candidate.title.toLowerCase();
    const angleLower = candidate.angle.toLowerCase();
    const hasCuriosityTrigger = curiosityTriggers.some(word =>
      titleLower.includes(word) || angleLower.includes(word)
    );
    const curiosityWordBonus = hasCuriosityTrigger ? 2 : 0;

    // 3. Title Length Bonus: +1 if word count is 5 to 15 words
    const titleWords = candidate.title.split(/\s+/).filter(Boolean).length;
    const titleLengthBonus = (titleWords >= 5 && titleWords <= 15) ? 1 : 0;

    // Hybrid Overall Score (capped at 50)
    const overallScore = Math.min(50, baseScore + interestBonus + curiosityWordBonus + titleLengthBonus);

    return {
      candidate,
      scored,
      overallScore
    };
  });

  // Filter candidates where overallScore >= 20
  let validCandidates = processedCandidates.filter(pc => pc.overallScore >= 20);
  let chosen = validCandidates.length > 0
    ? validCandidates.reduce((best, curr) => curr.overallScore > best.overallScore ? curr : best, validCandidates[0])
    : null;

  // If all candidates are < 20
  if (!chosen) {
    const bestOfAll = processedCandidates.reduce((best, curr) => curr.overallScore > best.overallScore ? curr : best, processedCandidates[0]);
    if (state.requestedTopic) {
      // User-requested: use best candidate anyway to not block user
      console.warn(`⚠️ [Curiosity Scorer] All candidates scored < 20, but topic is user-requested. Using best candidate: "${bestOfAll.candidate.title}" with score ${bestOfAll.overallScore}`);
      chosen = bestOfAll;
    } else {
      // Interest-based: Reject and trigger retry loop
      console.warn(`❌ [Curiosity Scorer] All candidates scored < 20 (Best: ${bestOfAll.overallScore}). Rejecting batch to trigger retry.`);
      const durationMs = Date.now() - startTime;
      const nodeMetric: NodeMetrics = {
        nodeName: "curiosity scorer",
        durationMs,
        success: false,
        inputTokens,
        outputTokens
      };
      return {
        currentTopic: undefined,
        dedupPassed: false,
        dedupAttempts: state.dedupAttempts + 1,
        nodeMetrics: [nodeMetric]
      };
    }
  }

  // Construct final Topic object
  const bestTopic = chosen.candidate;
  const bestScored = chosen.scored;
  const bestOverallScore = chosen.overallScore;

  const finalTopic: Topic = {
    id: bestTopic.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    title: bestTopic.title,
    domain: bestTopic.category,
    angle: bestTopic.angle,
    summary: bestTopic.hook,
    connections: bestTopic.connections || [],
    read: false,
    novelty: bestScored.novelty,
    surprise: bestScored.surprise,
    specificity: bestScored.specificity,
    mechanism: bestScored.mechanism,
    rabbitHolePotential: bestScored.rabbitHolePotential,
    overallScore: bestOverallScore,
    primaryQuestion: bestScored.primaryQuestion,
    winningCandidateReason: bestScored.winningCandidateReason
  };

  console.log(`✅ [Curiosity Scorer] Selected: "${finalTopic.title}" (Score: ${finalTopic.overallScore}/50)`);
  console.log(`   • Primary Question: "${finalTopic.primaryQuestion}"`);
  console.log(`   • Reason: "${finalTopic.winningCandidateReason}"`);

  // Generate vector embedding
  let embedding: number[] | undefined;
  try {
    embedding = await generateEmbedding(`${finalTopic.title}\n${finalTopic.summary}`);
  } catch (err) {
    console.warn("⚠️ [Curiosity Scorer] Embedding generation failed:", err);
  }

  const durationMs = Date.now() - startTime;
  const nodeMetric: NodeMetrics = {
    nodeName: "curiosity scorer",
    durationMs,
    success: true,
    inputTokens,
    outputTokens,
    primaryQuestion: finalTopic.primaryQuestion,
    winningCandidateReason: finalTopic.winningCandidateReason
  };

  return {
    currentTopic: finalTopic,
    topicEmbedding: embedding,
    dedupPassed: true,
    nodeMetrics: [nodeMetric]
  };
}
