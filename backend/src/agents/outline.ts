import { ai, safetySettings, withAbort } from "../lib/gemini";
import { AgentStateType, NodeMetrics, ArticleOutline } from "../types";

export async function outlineAgent(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const startTime = Date.now();
  const signal = state.signal;

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const topic = state.currentTopic!;
  console.log(`\n📋 [Outline Agent] Designing outline for: "${topic.title}"...`);

  const model = state.userSettings?.model || "gemini-3.1-flash-lite";

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let keyFacts: string[] = [];

  // Step 1: Extract Key Facts (Only if Research Brief is not present)
  if (!state.researchBrief) {
    console.log(`📋 [Outline Agent] Research Brief not found. Extracting key facts as fallback...`);
    const researchContext = [
      ...(state.research || []).map((r, i) => `Source ${i + 1}: ${r.title}\n${r.content.slice(0, 600)}`),
      ...(state.wikiResearch || []).map((w, i) => `Wikipedia Source ${i + 1}:\n${w.slice(0, 800)}`)
    ].join("\n\n---\n\n");

    const extractPrompt = `You are a research assistant. Identify the 8-12 most important key facts, statistics, or scientific mechanisms about the topic: "${topic.title}" (${topic.summary || ""}).
${researchContext.trim() ? `Use the provided research to find specific facts:\n\n=== RESEARCH CONTENT ===\n${researchContext}\n=== END RESEARCH CONTENT ===` : "Use your own extensive general knowledge to identify key facts."}

Return ONLY a JSON object matching this schema:
{
  "facts": ["fact 1", "fact 2", ...]
}`;

    try {
      const apiCall = ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: extractPrompt }] }],
        config: {
          safetySettings: safetySettings as any,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              facts: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["facts"]
          }
        }
      });

      const response = await withAbort(apiCall, signal);

      if (response.usageMetadata) {
        totalInputTokens += response.usageMetadata.promptTokenCount || 0;
        totalOutputTokens += response.usageMetadata.candidatesTokenCount || 0;
      }

      const parsed = JSON.parse(response.text || "{}");
      keyFacts = parsed.facts || [];
    } catch (err: any) {
      if (err.name === "AbortError" || err.message === "Aborted") {
        throw err;
      }
      console.warn("⚠️ [Outline Agent] Failed to extract key facts:", err);
    }

    if (keyFacts.length === 0) {
      keyFacts = [
        `Core concept of ${topic.title}.`,
        `${topic.summary || "General overview of the topic."}`,
        `Practical applications and mechanisms of ${topic.title}.`,
        `Limitations and challenges in implementing or understanding ${topic.title}.`
      ];
    }
  }

  // Formulate inputs for Outline Prompt
  let briefText = "";
  if (state.researchBrief) {
    const brief = state.researchBrief;
    briefText = `Research Brief:
- Core Concepts:
${(brief.coreConcepts || []).map(c => `  - ${c}`).join("\n")}
- Interesting Facts:
${(brief.interestingFacts || []).map(c => `  - ${c}`).join("\n")}
- Examples:
${(brief.examples || []).map(c => `  - ${c}`).join("\n")}
- Controversies:
${(brief.controversies || []).map(c => `  - ${c}`).join("\n")}
- Historical Context:
${(brief.historicalContext || []).map(c => `  - ${c}`).join("\n")}
- Recent Developments:
${(brief.recentDevelopments || []).map(c => `  - ${c}`).join("\n")}
- Article Angles:
${(brief.articleAngles || []).map(c => `  - ${c}`).join("\n")}
- Narrative Hooks:
${(brief.narrativeHooks || []).map(c => `  - ${c}`).join("\n")}
- Counterintuitive Insights:
${(brief.counterintuitiveInsights || []).map(c => `  - ${c}`).join("\n")}
- Must Include Facts:
${(brief.mustIncludeFacts || []).map(c => `  - ${c}`).join("\n")}
- Section Suggestions:
${(brief.sectionSuggestions || []).map(c => `  - ${c}`).join("\n")}${brief.premiseNotes && brief.premiseNotes.length > 0 ? `\n- Premise Notes:\n${brief.premiseNotes.map(c => `  - ${c}`).join("\n")}` : ""}
- Primary Angle (ENFORCE THIS): ${brief.primaryAngle || "None"}
- Forbidden Angles (STRICTLY AVOID THESE): ${(brief.forbiddenAngles || []).join(", ") || "None"}
- Primary Question to Answer: ${brief.primaryQuestion || "None"}
- Winning Topic Selection Reason: ${brief.winningCandidateReason || "None"}`;
  } else {
    briefText = `Key Facts:
${keyFacts.map((f) => `- ${f}`).join("\n")}`;
  }

  let insightsText = "";
  if (state.insightBrief && state.insightBrief.coreInsights.length > 0) {
    insightsText = `=== CORE INSIGHTS ===
${state.insightBrief.coreInsights.map((ins, i) => `Insight ${i + 1}: ${ins.insight}
- Why Interesting: ${ins.whyInteresting}
- Why Counterintuitive: ${ins.whyCounterintuitive || "N/A"}
- Supporting Evidence: ${(ins.supportingEvidence || []).join(", ")}
- Confidence: ${ins.confidence}`).join("\n\n")}
=== END CORE INSIGHTS ===`;
  }

  // Step 2: Generate Outline
  const readingTime = state.userSettings?.reading_time || "5min";
  const targetTotalWords = { "2min": 300, "5min": 700, "10min": 1200 }[readingTime] ?? 700;

  const outlinePrompt = `You are an expert outline agent. Your task is to design a high-quality, structured outline for an article about the topic: "${topic.title}".

Inputs:
- Topic: "${topic.title}"
- Research Summary: ${state.researchSummary || "No research summary available."}
- ${state.researchBrief ? "Research Brief" : "Key Facts"}:
${briefText}
${insightsText ? `- Insights Brief:\n${insightsText}` : ""}
- Reading Time Target: ${readingTime} (Total target words for the entire article: ~${targetTotalWords} words)

Requirements for the outline:
1. Provide a title and a compelling hook for the introduction.
2. Generate between 4 and 6 sections in the outline.
3. Ensure a logical progression throughout the outline.
4. Cover basic and fundamental concepts in the early sections before introducing advanced concepts.
5. Include at least one section dedicated to examples and/or real-world applications.
6. Include at least one section dedicated to limitations, challenges, or controversies.
7. CRITICAL: Every major section must teach or revolve around at least one specific "centralInsight" from the Insights Brief (if available).
8. CRITICAL: Avoid creating sections that are only fact collections. Prefer explanation-driven sections over chronology-driven sections when appropriate, shaping section organization around insights.
9. For each section, provide:
   - A clear section heading
   - The purpose / goal of the section
   - The "centralInsight" this section teaches or explains
   - A list of specific key facts or points that must be covered in this section
   - A specific example or case study to illustrate the section's core idea
   - A smooth transition sentence connecting to the next section
   - A "targetWordCount" for the section. Distribute the total target words (~${targetTotalWords}) across all generated sections. Ensure each section gets a realistic portion (e.g. 50-300+ words per section depending on the reading time).
   - A "formattingHint" suggesting an optimal markdown element layout for this section (e.g., "Use a comparison table", "Use a bulleted list for key statistics", "Use a blockquote callout for the core surprising insight", "Standard paragraphs with bold key terms"). Make sure at least one section in the outline has a hint for a table, and at least one has a hint for a bulleted list or a blockquote callout.
10. CRITICAL: Enforce the Primary Angle. The entire outline, sections, hook, and facts must center on this angle: "${state.researchBrief?.primaryAngle || topic.angle || ''}". Do NOT deviate from it.
11. CRITICAL: Strictly avoid the Forbidden Angles: "${(state.researchBrief?.forbiddenAngles || []).join(", ")}". Do not touch upon these topics in any section.
12. CRITICAL: The outline must guide the article to directly answer the Primary Question: "${state.researchBrief?.primaryQuestion || topic.primaryQuestion || ''}".

Return ONLY a JSON object matching this schema:
{
  "title": "A compelling title for the article",
  "hook": "An engaging hook for the introduction",
  "sections": [
    {
      "heading": "Section Heading",
      "purpose": "Detailed purpose/goal of the section",
      "centralInsight": "The specific central insight this section teaches/revolves around",
      "keyFacts": ["Fact 1 to include", "Fact 2 to include", ...],
      "example": "A specific example or case study for this section",
      "transition": "Transition sentence to the next section",
      "targetWordCount": 150,
      "formattingHint": "A formatting suggestion for markdown elements"
    }
  ]
}`;

  let outline: ArticleOutline;
  try {
    const apiCall = ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: outlinePrompt }] }],
      config: {
        safetySettings: safetySettings as any,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            hook: { type: "string" },
            sections: {
              type: "array",
              minItems: 4,
              maxItems: 6,
              items: {
                type: "object",
                properties: {
                  heading: { type: "string" },
                  purpose: { type: "string" },
                  centralInsight: { type: "string" },
                  keyFacts: {
                    type: "array",
                    items: { type: "string" }
                  },
                  example: { type: "string" },
                  transition: { type: "string" },
                  targetWordCount: { type: "integer" },
                  formattingHint: { type: "string" }
                },
                required: ["heading", "purpose", "centralInsight", "keyFacts", "example", "transition", "targetWordCount", "formattingHint"]
              }
            }
          },
          required: ["title", "hook", "sections"]
        }
      }
    });

    const response = await withAbort(apiCall, signal);

    if (response.usageMetadata) {
      totalInputTokens += response.usageMetadata.promptTokenCount || 0;
      totalOutputTokens += response.usageMetadata.candidatesTokenCount || 0;
    }

    const parsed = JSON.parse(response.text || "{}");
    if (!parsed.title || !parsed.hook || !Array.isArray(parsed.sections)) {
      throw new Error("Invalid outline structure returned by API.");
    }
    outline = parsed;
  } catch (err: any) {
    if (err.name === "AbortError" || err.message === "Aborted") {
      throw err;
    }
    console.warn("⚠️ [Outline Agent] Failed to generate outline, generating fallback...", err);
    const fallbackSectionTarget = Math.round(targetTotalWords / 4);
    outline = {
      title: topic.title,
      hook: `Exploring the fascinating concepts and realities behind ${topic.title}.`,
      sections: [
        { 
          heading: `Introduction to ${topic.title}`, 
          purpose: "Define the core concept, its basic mechanism, and explain its significance.",
          centralInsight: `The core principles of ${topic.title} have broader implications.`,
          keyFacts: [`Core concept definition of ${topic.title}.`],
          example: `An introduction example for ${topic.title}.`,
          transition: "Transition to the core mechanisms.",
          targetWordCount: fallbackSectionTarget,
          formattingHint: "Standard paragraphs with bold key terms"
        },
        { 
          heading: `Core Mechanisms and Key Facts`, 
          purpose: "Provide detailed scientific or factual details explaining how it works.",
          centralInsight: `Understanding the specific mechanisms reveals deeper patterns in how ${topic.title} behaves.`,
          keyFacts: [`Factual details about ${topic.title}.`],
          example: `A mechanistic example of ${topic.title}.`,
          transition: "Transition to real-world applications.",
          targetWordCount: fallbackSectionTarget,
          formattingHint: "Use a bulleted list for key statistics"
        },
        { 
          heading: `Real-World Applications and Examples`, 
          purpose: "Illustrate the concept with specific real-world examples, use cases, or applications.",
          centralInsight: `Practical applications of ${topic.title} demonstrate its impact on daily operations.`,
          keyFacts: [`Application facts for ${topic.title}.`],
          example: `A case study of ${topic.title}.`,
          transition: "Transition to limitations and challenges.",
          targetWordCount: fallbackSectionTarget,
          formattingHint: "Use a comparison table"
        },
        { 
          heading: `Limitations and Challenges`, 
          purpose: "Discuss the challenges, limitations, and future outlook or open questions.",
          centralInsight: `Addressing structural challenges is necessary to fully leverage the benefits of ${topic.title}.`,
          keyFacts: [`Challenges associated with ${topic.title}.`],
          example: `An example illustrating a limitation of ${topic.title}.`,
          transition: "Concluding thoughts.",
          targetWordCount: fallbackSectionTarget,
          formattingHint: "Use a blockquote callout for the core surprising insight"
        }
      ]
    };
  }

  const durationMs = Date.now() - startTime;
  const nodeMetric: NodeMetrics = {
    nodeName: "outline",
    durationMs,
    success: true,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens
  };

  return {
    outline,
    keyFacts: keyFacts.length > 0 ? keyFacts : undefined,
    nodeMetrics: [nodeMetric]
  };
}
