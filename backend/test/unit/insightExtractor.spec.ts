import { describe, it, expect } from "vitest";

describe("insightExtractorAgent", () => {
  it("synthesizes insights successfully matching the schema", async () => {
    const gemini = await import("../../src/lib/gemini");

    let callCount = 0;
    (gemini.ai.models.generateContent as any).mockImplementation(
      async (_args: any) => {
        callCount++;
        return {
          text: JSON.stringify({
            coreInsights: [
              {
                insight: "Civilization was built on excess calories before technology.",
                whyInteresting: "Shifts focus of progress from tool-making to energy capture.",
                whyCounterintuitive: "We think technology drives cities, but calorie surplus did.",
                supportingEvidence: ["[Source 1] Grain storage was true origin of municipal bureaucracy"],
                confidence: "high"
              },
              {
                insight: "Monasteries functioned as early venture capital funds.",
                whyInteresting: "Reveals how religious networks drove agricultural expansion.",
                supportingEvidence: ["[Wikipedia Source 1] Cistercians financed early industrial mills"],
                confidence: "medium"
              },
              {
                insight: "Standardization of time zones was a consequence of train crashes.",
                whyInteresting: "Shows how public safety concerns overrode solar time alignment.",
                supportingEvidence: ["[Source 2] Railroad schedules required unified time grids to prevent head-on collisions"],
                confidence: "high"
              }
            ]
          }),
          usageMetadata: { promptTokenCount: 15, candidatesTokenCount: 10 }
        };
      }
    );

    const { insightExtractorAgent } = await import("../../src/agents/insightExtractor");
    const state = {
      userId: "u1",
      currentTopic: { title: "Topic", summary: "Summary" },
      research: [
        { title: "Source 1", content: "Some content about grain storage", score: 0.9, url: "url1" }
      ],
      wikiResearch: [
        "Some Wikipedia content about Cistercians"
      ],
      researchBrief: {
        coreConcepts: ["Concept A"],
        interestingFacts: ["Fact A"],
        examples: [],
        controversies: [],
        historicalContext: [],
        recentDevelopments: [],
        articleAngles: [],
        narrativeHooks: [],
        counterintuitiveInsights: [],
        mustIncludeFacts: [],
        sectionSuggestions: []
      },
      userSettings: {},
    } as any;

    const res = await insightExtractorAgent(state);

    expect(callCount).toBe(1);
    expect(res.insightBrief).toBeDefined();
    expect(res.insightBrief?.coreInsights.length).toBe(3);
    expect(res.insightBrief?.coreInsights[0].insight).toBe("Civilization was built on excess calories before technology.");
    expect(res.insightBrief?.coreInsights[0].confidence).toBe("high");
    expect(res.insightBrief?.coreInsights[0].supportingEvidence).toEqual(["[Source 1] Grain storage was true origin of municipal bureaucracy"]);
    expect(res.nodeMetrics?.[0].nodeName).toBe("insight extractor");
    expect(res.nodeMetrics?.[0].success).toBe(true);
    expect(res.nodeMetrics?.[0].inputTokens).toBe(15);
    expect(res.nodeMetrics?.[0].outputTokens).toBe(10);
  });

  it("falls back gracefully on API failure", async () => {
    const gemini = await import("../../src/lib/gemini");
    (gemini.ai.models.generateContent as any).mockImplementation(async () => {
      throw new Error("API Limit Reached");
    });

    const { insightExtractorAgent } = await import("../../src/agents/insightExtractor");
    const state = {
      userId: "u1",
      currentTopic: { title: "Failed Topic", summary: "Failed summary" },
      userSettings: {},
    } as any;

    const res = await insightExtractorAgent(state);

    expect(res.insightBrief).toBeDefined();
    expect(res.insightBrief?.coreInsights.length).toBe(3);
    expect(res.insightBrief?.coreInsights[0].insight).toContain("Failed Topic");
    expect(res.nodeMetrics?.[0].success).toBe(true);
  });
});
