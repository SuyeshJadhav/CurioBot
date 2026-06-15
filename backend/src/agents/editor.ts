import { ai, safetySettings } from "../lib/gemini";
import { AgentStateType, NodeMetrics } from "../types";

export async function editorAgent(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const startTime = Date.now();
  const signal = state.signal;

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const model = state.userSettings?.model || "gemini-3.1-flash-lite";
  const draft = state.article || "";
  
  if (!draft) {
    console.log(`⚠️ [Editor Agent] No draft article found in state to edit.`);
    return {};
  }

  console.log(`\n✏️  [Editor Agent] Editing and polishing article...`);

  const keyFactsContext = state.keyFacts && state.keyFacts.length > 0
    ? `Key Facts:\n${state.keyFacts.map((f, i) => `${i + 1}. ${f}`).join("\n")}`
    : "No key facts available.";

  const sectionTargetsContext = state.outline?.sections && state.outline.sections.length > 0
    ? `Outline Section Targets:\n${state.outline.sections.map((s, i) => `- Section "${s.heading}": Target ${s.targetWordCount || "unspecified"} words`).join("\n")}`
    : "No outline section targets available.";

  const prompt = `You are a developmental editor, not a copy editor. Your job is to improve the narrative structure, curiosity, coherence, fact consistency, and educational value of the draft article. You may rewrite sections substantially if necessary.

Draft Article:
${draft}

Reference Information (for factual verification and specific details):
${keyFactsContext}
Research Summary: ${state.researchSummary || "None"}
Research Brief: ${state.researchBrief ? JSON.stringify(state.researchBrief) : "None"}

${sectionTargetsContext}

Priority Guidelines (If narrative quality conflicts with factual accuracy, factual accuracy always wins):
1. Fact Consistency & Unsupported Claims Removal: Compare the Research Summary, Research Brief, and draft Article to align facts and eliminate contradictions. Identify if the article contains unsupported claims, contradicts the research summary, or supports a debunked premise, and revise the article to align with research. If the Research Summary disproves the topic premise, pivot the article toward explaining the misconception and presenting the corrected understanding.
2. Narrative Flow Review: Ensure every article follows a coherent progression: Hook -> Core Concept -> Examples -> Implications -> Conclusion. Reorder paragraphs, rewrite transitions, merge repetitive passages, and strengthen weak section openings.
3. Curiosity Optimization: Identify the strongest surprising fact, counterintuitive insight, and narrative hook from the Research Brief and ensure they appear prominently. Prefer surprise -> explanation over definition -> explanation.
4. Section Balance: Expand underdeveloped sections and compress overly repetitive sections. Use targetWordCounts as guidance when determining whether a section is underdeveloped or overdeveloped.
5. Conclusion Quality: Avoid generic endings. The conclusion should connect back to the hook, reveal a larger implication, or leave the reader with an interesting perspective.

Return ONLY a JSON object matching this schema:
{
  "editedArticle": "The fully edited and polished article in markdown format",
  "editorNotes": {
    "factCorrections": number (count of factual corrections made),
    "sectionsExpanded": number (count of sections expanded),
    "sectionsCompressed": number (count of sections compressed),
    "transitionsImproved": number (count of transitions rewritten/improved),
    "hookStrengthened": boolean (whether the hook was strengthened/optimized for curiosity)
  }
}`;

  let response: any;
  let inputTokens = 0;
  let outputTokens = 0;

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
            editedArticle: { type: "string" },
            editorNotes: {
              type: "object",
              properties: {
                factCorrections: { type: "integer" },
                sectionsExpanded: { type: "integer" },
                sectionsCompressed: { type: "integer" },
                transitionsImproved: { type: "integer" },
                hookStrengthened: { type: "boolean" }
              },
              required: ["factCorrections", "sectionsExpanded", "sectionsCompressed", "transitionsImproved", "hookStrengthened"]
            }
          },
          required: ["editedArticle", "editorNotes"]
        }
      }
    });

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
      inputTokens = response.usageMetadata.promptTokenCount || 0;
      outputTokens = response.usageMetadata.candidatesTokenCount || 0;
    }
  } catch (e: any) {
    if (e.name === "AbortError" || e.message === "Aborted") {
      throw e;
    }
    console.error("⚠️ [Editor Agent] API error during generation:", e);
    throw e;
  }

  const durationMs = Date.now() - startTime;
  const rawText = response.text || "";
  let editedArticle = draft;
  let factCorrections = 0;
  let sectionsExpanded = 0;
  let sectionsCompressed = 0;
  let transitionsImproved = 0;
  let hookStrengthened = false;

  try {
    const parsed = JSON.parse(rawText);
    editedArticle = parsed.editedArticle || draft;
    if (parsed.editorNotes) {
      factCorrections = typeof parsed.editorNotes.factCorrections === "number" ? parsed.editorNotes.factCorrections : 0;
      sectionsExpanded = typeof parsed.editorNotes.sectionsExpanded === "number" ? parsed.editorNotes.sectionsExpanded : 0;
      sectionsCompressed = typeof parsed.editorNotes.sectionsCompressed === "number" ? parsed.editorNotes.sectionsCompressed : 0;
      transitionsImproved = typeof parsed.editorNotes.transitionsImproved === "number" ? parsed.editorNotes.transitionsImproved : 0;
      hookStrengthened = !!parsed.editorNotes.hookStrengthened;
    }
  } catch (err) {
    console.warn("⚠️ [Editor Agent] Failed to parse response JSON, falling back to original draft:", err);
  }

  const nodeMetric: NodeMetrics = {
    nodeName: "editor",
    durationMs,
    success: true,
    inputTokens,
    outputTokens,
    factCorrections,
    sectionsExpanded,
    sectionsCompressed,
    transitionsImproved,
    hookStrengthened
  };

  return {
    article: editedArticle,
    nodeMetrics: [nodeMetric]
  };
}
