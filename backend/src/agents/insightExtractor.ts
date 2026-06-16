import { ai, safetySettings } from "../lib/gemini";
import { AgentStateType, NodeMetrics, InsightBrief } from "../types";

export async function insightExtractorAgent(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const startTime = Date.now();
  const signal = state.signal;

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const topic = state.currentTopic!;
  console.log(`\n🧠 [Insight Extractor] Synthesizing insights for: "${topic.title}"...`);

  const model = state.userSettings?.model || "gemini-3.1-flash-lite";

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let insightBrief: InsightBrief;

  const researchContext = [
    ...(state.research || []).map((r, i) => `Source ${i + 1}: ${r.title}\n${r.content.slice(0, 600)}`),
    ...(state.wikiResearch || []).map((w, i) => `Wikipedia Source ${i + 1}:\n${w.slice(0, 800)}`)
  ].join("\n\n---\n\n");

  const prompt = `You are a synthesis engine, not a summarizer. Your job is to transform facts into deeper insights.
Identify non-obvious conclusions, hidden patterns, counterintuitive lessons, and deeper principles that emerge from the research.

Guidelines:
1. Generate between 3 and 5 high-quality insights.
2. Contradiction Synthesis: Look for any contradictions, discrepancies, or conflicting findings across the research sources. Synthesize these conflicts into insights that explain why the discrepancy exists, or what deeper principle/caveat it reveals.
3. Traceability/Evidence: Every insight must be grounded in specific facts. The "supportingEvidence" array MUST contain direct references/quotes from the sources, explicitly citing the source identifier (e.g. "[Source 1] ...", "[Wikipedia Source 2] ...").
4. Assign a confidence rating ("high", "medium", or "low") to each insight based on the strength of the supporting evidence and consensus in the sources.

Avoid:
- Repeating facts
- Rewriting section summaries
- Obvious observations

Good insight example:
Fact: "Cities emerged after agricultural surplus."
Insight: "Civilization was built on excess calories before it was built on technology."
Why Interesting: "It shifts the focus of human progress from tool-making to energy capture."
Why Counterintuitive: "We usually think of technology as the driver of cities, but it was just calorie excess."
Supporting Evidence: ["[Source 1] Grain storage was the true origin of municipal bureaucracy", "[Wikipedia Source 2] Early towns grew around central granaries"]
Confidence: "high"

Bad insight example:
"Wheat helped create cities."

Inputs:
- Current Topic: "${topic.title}" (${topic.summary || ""})
- Research Brief: ${state.researchBrief ? JSON.stringify(state.researchBrief) : "No Research Brief available."}
- Research Content:
${researchContext || "No research context available."}

Return ONLY a JSON object matching this schema:
{
  "coreInsights": [
    {
      "insight": "The synthesized non-obvious lesson or pattern",
      "whyInteresting": "Why this matters or what larger principle it reveals",
      "whyCounterintuitive": "What assumption this challenges (optional)",
      "supportingEvidence": ["evidence fact 1 with citation", "evidence fact 2 with citation", ...],
      "confidence": "high" | "medium" | "low"
    }
  ]
}`;

  try {
    const apiCall = ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        safetySettings: safetySettings as any,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            coreInsights: {
              type: "array",
              minItems: 3,
              maxItems: 5,
              items: {
                type: "object",
                properties: {
                  insight: { type: "string" },
                  whyInteresting: { type: "string" },
                  whyCounterintuitive: { type: "string" },
                  supportingEvidence: {
                    type: "array",
                    items: { type: "string" }
                  },
                  confidence: { type: "string", enum: ["high", "medium", "low"] }
                },
                required: ["insight", "whyInteresting", "supportingEvidence", "confidence"]
              }
            }
          },
          required: ["coreInsights"]
        }
      }
    });

    let response: any;
    if (signal) {
      const abortPromise = new Promise<never>((_, reject) => {
        signal.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
      response = await Promise.race([apiCall, abortPromise]);
    } else {
      response = await apiCall;
    }

    if (response.usageMetadata) {
      totalInputTokens += response.usageMetadata.promptTokenCount || 0;
      totalOutputTokens += response.usageMetadata.candidatesTokenCount || 0;
    }

    const parsed = JSON.parse(response.text || "{}");
    if (!Array.isArray(parsed.coreInsights)) {
      throw new Error("Invalid insight structure returned by API.");
    }
    insightBrief = parsed;
  } catch (err: any) {
    if (err.name === "AbortError" || err.message === "Aborted") {
      throw err;
    }
    console.warn("⚠️ [Insight Extractor] Failed to extract insights, generating fallback...", err);
    
    // Fallback: 3 basic insights derived from the topic
    insightBrief = {
      coreInsights: [
        {
          insight: `The core mechanism of ${topic.title} suggests underlying complexities that challenge simple assumptions.`,
          whyInteresting: "It forces the reader to look beyond surface-level functions.",
          supportingEvidence: [`[General Knowledge] Concept details of ${topic.title}.`],
          confidence: "medium"
        },
        {
          insight: `${topic.title} represents a systemic shift in how we approach problems in this domain.`,
          whyInteresting: "It connects isolated practices to a broader methodology.",
          supportingEvidence: [`[General Knowledge] Applications of ${topic.title}.`],
          confidence: "medium"
        },
        {
          insight: `The limitations of ${topic.title} highlight the trade-offs inherent in standard implementations.`,
          whyInteresting: "It shifts the discussion from purely benefits to structural constraints.",
          supportingEvidence: [`[General Knowledge] Constraints of ${topic.title}.`],
          confidence: "medium"
        }
      ]
    };
  }

  const durationMs = Date.now() - startTime;
  const nodeMetric: NodeMetrics = {
    nodeName: "insight extractor",
    durationMs,
    success: true,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens
  };

  return {
    insightBrief,
    nodeMetrics: [nodeMetric]
  };
}
