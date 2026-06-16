import { ai, safetySettings, withAbort } from "../lib/gemini";
import { AgentStateType, NodeMetrics } from "../types";

export async function observabilityAgent(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const startTime = Date.now();
  const signal = state.signal;

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  console.log(`\n📊 [Observability Agent] Running evaluation metrics...`);

  const model = state.userSettings?.model || "gemini-3.1-flash-lite";
  const article = state.article || "";

  // 1. Calculate researchFactCount using sentence counting heuristic
  let researchFactCount = 0;
  for (const r of state.research || []) {
    researchFactCount += (r.content || "").split(/[.!?]+/).filter(s => s.trim().length > 10).length;
  }
  for (const w of state.wikiResearch || []) {
    researchFactCount += (w || "").split(/[.!?]+/).filter(s => s.trim().length > 10).length;
  }

  // 2. Calculate briefFactCount
  let briefFactCount = 0;
  if (state.researchBrief) {
    const brief = state.researchBrief;
    briefFactCount += (brief.coreConcepts || []).length;
    briefFactCount += (brief.interestingFacts || []).length;
    briefFactCount += (brief.examples || []).length;
    briefFactCount += (brief.controversies || []).length;
    briefFactCount += (brief.historicalContext || []).length;
    briefFactCount += (brief.recentDevelopments || []).length;
    briefFactCount += (brief.articleAngles || []).length;
    briefFactCount += (brief.narrativeHooks || []).length;
    briefFactCount += (brief.counterintuitiveInsights || []).length;
    briefFactCount += (brief.mustIncludeFacts || []).length;
    briefFactCount += (brief.sectionSuggestions || []).length;
  }

  // 3. Calculate outlineSectionCount
  const outlineSectionCount = state.outline?.sections?.length || 0;

  // 4. Calculate articleWordCount
  const articleWordCount = article ? article.split(/\s+/).filter(Boolean).length : 0;

  // 5. Evaluate researchFactsUsed using Gemini
  const mustIncludeFacts = state.researchBrief?.mustIncludeFacts || state.keyFacts || [];
  let researchFactsUsed = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  if (mustIncludeFacts.length > 0 && article) {
    const prompt = `You are an evaluation assistant. Your task is to determine how many of the key research facts were actually used or referenced in the final article.

List of Research Facts:
${mustIncludeFacts.map((f, i) => `${i + 1}. ${f}`).join("\n")}

Final Article:
${article}

Analyze the article and check if each fact is present (either directly or paraphrased).
Return ONLY a JSON object matching this schema:
{
  "factsUsed": ["fact 1", "fact 2", ...], // list of facts from the input list that were used
  "count": 0 // number of facts used
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
              factsUsed: { type: "array", items: { type: "string" } },
              count: { type: "integer" }
            },
            required: ["factsUsed", "count"]
          }
        }
      });

      const response = await withAbort(apiCall, signal);

      if (response.usageMetadata) {
        totalInputTokens += response.usageMetadata.promptTokenCount || 0;
        totalOutputTokens += response.usageMetadata.candidatesTokenCount || 0;
      }

      const parsed = JSON.parse(response.text || "{}");
      researchFactsUsed = typeof parsed.count === "number" ? parsed.count : (parsed.factsUsed || []).length;
    } catch (err: any) {
      if (err.name === "AbortError" || err.message === "Aborted") {
        throw err;
      }
      console.warn("⚠️ [Observability Agent] Failed to evaluate research facts used, falling back to 0...", err);
    }
  }

  let factConsistency = 0;
  let hookStrength = 0;
  let narrativeFlow = 0;
  let curiosityFactor = 0;
  let sectionBalance = 0;
  let conclusionQuality = 0;
  let unsupportedClaims = 0;
  let informationDensity = 0;
  let curiosityGap = 0;
  let insightDensity = 0;
  let insightOriginality = 0;
  let factToInsightRatio = 0;
  let insightsUsed = 0;

  if (article) {
    const evalPrompt = `You are an expert educational content evaluator. Assess the quality of the final article relative to the Research Summary, Research Brief, and Insight Brief.

Final Article:
${article}

Research Summary:
${state.researchSummary || "None"}

Research Brief:
${state.researchBrief ? JSON.stringify(state.researchBrief) : "None"}

Insight Brief:
${state.insightBrief ? JSON.stringify(state.insightBrief) : "None"}

Evaluation Criteria:
1. factConsistency (0-10): How consistent is the article with the research summary and brief? (10 = no contradictions; 0 = complete contradiction/misleading)
2. hookStrength (0-10): How engaging is the opening hook? Does it grab attention without cheap clickbait?
3. narrativeFlow (0-10): How logical and smooth is the transitions/progression (Hook -> Core Concept -> Examples -> Implications -> Conclusion)?
4. curiosityFactor (0-10): How well does it raise questions and present surprising/counterintuitive information?
5. sectionBalance (0-10): How balanced are the sections in length and development relative to outline targets (or relative to each other if outline targets are missing)?
6. conclusionQuality (0-10): Does the conclusion connect back to the hook, reveal a larger implication, and avoid generic clichés?
7. unsupportedClaims (integer count): The absolute count of claims in the article that are unsupported by, or directly contradict, the Research Summary and Research Brief.
8. informationDensity (0-10): Rate how dense the information is. Does each paragraph introduce new, meaningful knowledge and insights? (10 = extremely high density, no fluff or filler; 0 = extremely verbose/empty or redundant paragraphs)
9. curiosityGap (0-10): Rate the strength of the curiosity gap in the opening hook. Does the opening create a knowledge gap that the article later resolves, making the reader say "I need to read this"? (10 = powerful curiosity gap; 0 = weak opening that simply defines terms)
10. insightDensity (0-10): How often meaningful insights appear in the article.
11. insightOriginality (0-10): How non-obvious and intellectually satisfying the insights are.
12. factToInsightRatio (0-10): Rate whether facts support insights rather than dominate them as a "fact dump". (10 = facts perfectly support insights; 0 = article is just a list/dump of facts with no underlying insights).
13. insightsUsed (integer count): The count of core insights from the Insight Brief (if available) that were actually integrated, explained, or referenced in the final article.

Return ONLY a JSON object matching this schema:
{
  "factConsistency": number,
  "hookStrength": number,
  "narrativeFlow": number,
  "curiosityFactor": number,
  "sectionBalance": number,
  "conclusionQuality": number,
  "unsupportedClaims": number,
  "informationDensity": number,
  "curiosityGap": number,
  "insightDensity": number,
  "insightOriginality": number,
  "factToInsightRatio": number,
  "insightsUsed": number
}`;

    try {
      const apiCall = ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: evalPrompt }] }],
        config: {
          safetySettings: safetySettings as any,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              factConsistency: { type: "integer" },
              hookStrength: { type: "integer" },
              narrativeFlow: { type: "integer" },
              curiosityFactor: { type: "integer" },
              sectionBalance: { type: "integer" },
              conclusionQuality: { type: "integer" },
              unsupportedClaims: { type: "integer" },
              informationDensity: { type: "integer" },
              curiosityGap: { type: "integer" },
              insightDensity: { type: "integer" },
              insightOriginality: { type: "integer" },
              factToInsightRatio: { type: "integer" },
              insightsUsed: { type: "integer" }
            },
            required: [
              "factConsistency",
              "hookStrength",
              "narrativeFlow",
              "curiosityFactor",
              "sectionBalance",
              "conclusionQuality",
              "unsupportedClaims",
              "informationDensity",
              "curiosityGap",
              "insightDensity",
              "insightOriginality",
              "factToInsightRatio",
              "insightsUsed"
            ]
          }
        }
      });

      const response = await withAbort(apiCall, signal);

      if (response.usageMetadata) {
        totalInputTokens += response.usageMetadata.promptTokenCount || 0;
        totalOutputTokens += response.usageMetadata.candidatesTokenCount || 0;
      }

      const parsed = JSON.parse(response.text || "{}");
      factConsistency = typeof parsed.factConsistency === "number" ? parsed.factConsistency : 0;
      hookStrength = typeof parsed.hookStrength === "number" ? parsed.hookStrength : 0;
      narrativeFlow = typeof parsed.narrativeFlow === "number" ? parsed.narrativeFlow : 0;
      curiosityFactor = typeof parsed.curiosityFactor === "number" ? parsed.curiosityFactor : 0;
      sectionBalance = typeof parsed.sectionBalance === "number" ? parsed.sectionBalance : 0;
      conclusionQuality = typeof parsed.conclusionQuality === "number" ? parsed.conclusionQuality : 0;
      unsupportedClaims = typeof parsed.unsupportedClaims === "number" ? parsed.unsupportedClaims : 0;
      informationDensity = typeof parsed.informationDensity === "number" ? parsed.informationDensity : 0;
      curiosityGap = typeof parsed.curiosityGap === "number" ? parsed.curiosityGap : 0;
      insightDensity = typeof parsed.insightDensity === "number" ? parsed.insightDensity : 0;
      insightOriginality = typeof parsed.insightOriginality === "number" ? parsed.insightOriginality : 0;
      factToInsightRatio = typeof parsed.factToInsightRatio === "number" ? parsed.factToInsightRatio : 0;
      insightsUsed = typeof parsed.insightsUsed === "number" ? parsed.insightsUsed : 0;
    } catch (err: any) {
      if (err.name === "AbortError" || err.message === "Aborted") {
        throw err;
      }
      console.warn("⚠️ [Observability Agent] Failed to evaluate narrative quality metrics, falling back to 0...", err);
    }
  }

  const briefMustIncludeFacts = state.researchBrief?.mustIncludeFacts || [];
  const mustIncludeFactsCount = briefMustIncludeFacts.length;
  const mustIncludeFactsUsed = (state.researchBrief?.mustIncludeFacts && state.researchBrief.mustIncludeFacts.length > 0)
    ? researchFactsUsed
    : 0;

  const outlineTargetWords = (state.outline?.sections || []).reduce((acc, s) => acc + (s.targetWordCount || 0), 0);

  const durationMs = Date.now() - startTime;
  const insightsGenerated = state.insightBrief?.coreInsights?.length || 0;

  const nodeMetric: NodeMetrics = {
    nodeName: "observability",
    durationMs,
    success: true,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    mustIncludeFacts: mustIncludeFactsCount,
    mustIncludeFactsUsed,
    outlineTargetWords,
    actualArticleWords: articleWordCount,
    factConsistency,
    hookStrength,
    narrativeFlow,
    curiosityFactor,
    sectionBalance,
    conclusionQuality,
    unsupportedClaims,
    informationDensity,
    curiosityGap,
    primaryQuestion: state.currentTopic?.primaryQuestion,
    winningCandidateReason: state.currentTopic?.winningCandidateReason,
    insightDensity,
    insightOriginality,
    factToInsightRatio,
    insightsGenerated,
    insightsUsed
  };

  return {
    researchFactCount,
    briefFactCount,
    outlineSectionCount,
    articleWordCount,
    researchFactsUsed,
    insightsGenerated,
    insightsUsed,
    nodeMetrics: [nodeMetric]
  };
}
