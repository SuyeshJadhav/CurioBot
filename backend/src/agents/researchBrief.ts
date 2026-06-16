import { ai, safetySettings, withAbort } from "../lib/gemini";
import { AgentStateType, NodeMetrics, ResearchBrief } from "../types";

export async function researchBriefAgent(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const startTime = Date.now();
  const signal = state.signal;

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const topic = state.currentTopic!;
  console.log(`\n📋 [Research Brief Agent] Compiling research brief for: "${topic.title}"...`);

  const model = state.userSettings?.model || "gemini-3.1-flash-lite";

  // Combine research contexts
  const researchParts: string[] = [];
  if (state.researchSummary) {
    researchParts.push(`=== RESEARCH SUMMARY (HIGH PRIORITY) ===\n${state.researchSummary}\n=== END RESEARCH SUMMARY ===`);
  }
  
  const webResearch = (state.research || []).map((r, i) => `Source ${i + 1}: ${r.title}\n${r.content.slice(0, 600)}`).join("\n\n---\n\n");
  if (webResearch.trim()) {
    researchParts.push(`=== WEB RESEARCH ===\n${webResearch}\n=== END WEB RESEARCH ===`);
  }

  const wikiResearch = (state.wikiResearch || []).map((w, i) => `Wikipedia Source ${i + 1}:\n${w.slice(0, 800)}`).join("\n\n---\n\n");
  if (wikiResearch.trim()) {
    researchParts.push(`=== WIKIPEDIA RESEARCH ===\n${wikiResearch}\n=== END WIKIPEDIA RESEARCH ===`);
  }

  const researchContext = researchParts.join("\n\n");
  const prompt = `You are a Research Brief Agent. Your task is to analyze the research content about the topic: "${topic.title}" (${topic.summary || ""}) and compile a detailed, structured Research Brief to guide the writing process.

Selected Topic Details:
- Seed Angle: "${topic.angle || ""}"
- Seed Core Question: "${topic.primaryQuestion || ""}"
- Selection Reason: "${topic.winningCandidateReason || ""}"

Identify key information and group them into the following categories:
1. coreConcepts: Foundational ideas, definitions, and key components of the topic.
2. interestingFacts: Surprising details, trivia, statistics, or fascinating elements.
3. examples: Concrete real-world applications, case studies, or scenarios illustrating the topic.
4. controversies: Debates, criticisms, disagreements, or challenges related to the topic.
5. historicalContext: History, timeline, origins, or evolution of the topic.
6. recentDevelopments: Current updates, modern relevance, or cutting-edge news on the topic.
7. articleAngles: Distinct, engaging angles or perspectives from which this article could be written (e.g., educational, narrative, technological impact).
8. narrativeHooks: Engaging narrative hooks, scenes, or facts to open the article.
9. counterintuitiveInsights: Surprising or counterintuitive insights that challenge common understanding.
10. mustIncludeFacts: Essential, specific facts, figures, or details from the research that MUST be included in the article.
11. sectionSuggestions: Logical suggestions for structure or sections to cover this topic effectively.
12. premiseNotes: Warnings, corrections, contradictions, or premise issues discovered during research (e.g., false premises, myths, conflicts, unsupported claims).
13. primaryAngle: Refine the seed angle into a sharp, curiosity-driven angle for this specific article (e.g., "Why railway accidents created time zones").
14. forbiddenAngles: List 2-3 related angles or subtopics that MUST be strictly avoided to keep the article focused (e.g., "general history of clocks", "history of calendars").
15. primaryQuestion: Refine the seed core question that this article will directly answer.
16. winningCandidateReason: Copy or refine the reason why this candidate topic was selected.

CRITICAL INSTRUCTIONS:
- Treat the Research Summary as the authoritative synthesis of the available evidence.
- If the Research Summary identifies a false premise, contradiction, myth, or unsupported claim, preserve that finding in the brief (especially in "premiseNotes").
- Do not invent links between concepts that the Research Summary says are unrelated.
- When evidence conflicts, prefer the Research Summary over isolated snippets.
- Ensure primaryAngle is highly specific and forbiddenAngles defines clear boundaries.

${researchContext.trim() ? `Use the provided research to populate the brief:\n\n${researchContext}` : "Use your own extensive general knowledge to compile the brief."}

Return ONLY a JSON object matching this schema:
{
  "coreConcepts": ["concept 1", "concept 2", ...],
  "interestingFacts": ["fact 1", "fact 2", ...],
  "examples": ["example 1", "example 2", ...],
  "controversies": ["controversy 1", "controversy 2", ...],
  "historicalContext": ["history 1", "history 2", ...],
  "recentDevelopments": ["development 1", "development 2", ...],
  "articleAngles": ["angle 1", "angle 2", ...],
  "narrativeHooks": ["hook 1", "hook 2", ...],
  "counterintuitiveInsights": ["insight 1", "insight 2", ...],
  "mustIncludeFacts": ["must-include fact 1", "must-include fact 2", ...],
  "sectionSuggestions": ["suggestion 1", "suggestion 2", ...],
  "premiseNotes": ["warning/correction 1", "warning/correction 2", ...],
  "primaryAngle": "refined primary angle",
  "forbiddenAngles": ["forbidden angle 1", "forbidden angle 2"],
  "primaryQuestion": "refined primary question",
  "winningCandidateReason": "refined selection reason"
}`;

  let researchBrief: ResearchBrief;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

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
            coreConcepts: { type: "array", items: { type: "string" } },
            interestingFacts: { type: "array", items: { type: "string" } },
            examples: { type: "array", items: { type: "string" } },
            controversies: { type: "array", items: { type: "string" } },
            historicalContext: { type: "array", items: { type: "string" } },
            recentDevelopments: { type: "array", items: { type: "string" } },
            articleAngles: { type: "array", items: { type: "string" } },
            narrativeHooks: { type: "array", items: { type: "string" } },
            counterintuitiveInsights: { type: "array", items: { type: "string" } },
            mustIncludeFacts: { type: "array", items: { type: "string" } },
            sectionSuggestions: { type: "array", items: { type: "string" } },
            premiseNotes: { type: "array", items: { type: "string" } },
            primaryAngle: { type: "string" },
            forbiddenAngles: { type: "array", items: { type: "string" } },
            primaryQuestion: { type: "string" },
            winningCandidateReason: { type: "string" }
          },
          required: [
            "coreConcepts",
            "interestingFacts",
            "examples",
            "controversies",
            "historicalContext",
            "recentDevelopments",
            "articleAngles",
            "narrativeHooks",
            "counterintuitiveInsights",
            "mustIncludeFacts",
            "sectionSuggestions",
            "premiseNotes",
            "primaryAngle",
            "forbiddenAngles",
            "primaryQuestion",
            "winningCandidateReason"
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
    researchBrief = {
      coreConcepts: parsed.coreConcepts || [],
      interestingFacts: parsed.interestingFacts || [],
      examples: parsed.examples || [],
      controversies: parsed.controversies || [],
      historicalContext: parsed.historicalContext || [],
      recentDevelopments: parsed.recentDevelopments || [],
      articleAngles: parsed.articleAngles || [],
      narrativeHooks: parsed.narrativeHooks || [],
      counterintuitiveInsights: parsed.counterintuitiveInsights || [],
      mustIncludeFacts: parsed.mustIncludeFacts || [],
      sectionSuggestions: parsed.sectionSuggestions || [],
      premiseNotes: parsed.premiseNotes || [],
      primaryAngle: parsed.primaryAngle || topic.angle,
      forbiddenAngles: parsed.forbiddenAngles || [],
      primaryQuestion: parsed.primaryQuestion || topic.primaryQuestion,
      winningCandidateReason: parsed.winningCandidateReason || topic.winningCandidateReason
    };
  } catch (err: any) {
    if (err.name === "AbortError" || err.message === "Aborted") {
      throw err;
    }
    console.warn("⚠️ [Research Brief Agent] Failed to compile brief, generating fallback...", err);
    researchBrief = {
      coreConcepts: [`Core concepts of ${topic.title}.`],
      interestingFacts: [`Interesting facts about ${topic.title}.`],
      examples: [`Examples of ${topic.title} in practice.`],
      controversies: [`Controversies or debates around ${topic.title}.`],
      historicalContext: [`Historical context of ${topic.title}.`],
      recentDevelopments: [`Recent developments in ${topic.title}.`],
      articleAngles: [`Exploring the direct impact of ${topic.title}.`],
      narrativeHooks: [`Imagine a world where ${topic.title} is fully integrated.`],
      counterintuitiveInsights: [`Despite its reputation, ${topic.title} behaves unexpectedly.`],
      mustIncludeFacts: [`Key fact: ${topic.title} remains highly relevant.`],
      sectionSuggestions: ["Introduction", "Core Mechanism", "Applications", "Future Outlook"],
      premiseNotes: [],
      primaryAngle: topic.angle,
      forbiddenAngles: [],
      primaryQuestion: topic.primaryQuestion || `How does ${topic.title} work?`,
      winningCandidateReason: topic.winningCandidateReason || ""
    };
  }

  console.log("Result Log:", JSON.stringify({
    premiseNotesPresent: !!(researchBrief.premiseNotes && researchBrief.premiseNotes.length > 0),
    topic: topic.title,
    researchSummaryLength: state.researchSummary ? state.researchSummary.length : 0,
    researchBriefLength: JSON.stringify(researchBrief).length
  }, null, 2));

  console.log(JSON.stringify(researchBrief, null, 2));

  const durationMs = Date.now() - startTime;
  const nodeMetric: NodeMetrics = {
    nodeName: "research_brief",
    durationMs,
    success: true,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens
  };

  return {
    researchBrief,
    nodeMetrics: [nodeMetric]
  };
}
