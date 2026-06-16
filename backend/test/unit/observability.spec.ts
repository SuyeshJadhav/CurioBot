import { describe, it, expect } from "vitest";

describe("observabilityAgent", () => {
  it("calculates researchFactCount, briefFactCount, outlineSectionCount, articleWordCount, and researchFactsUsed correctly", async () => {
    const gemini = await import("../../src/lib/gemini");

    (gemini.ai.models.generateContent as any).mockImplementation(async (args: any) => {
      const props = args?.config?.responseSchema?.properties || {};
      if (props.factsUsed !== undefined) {
        return {
          text: JSON.stringify({
            factsUsed: ["Must Include Fact A", "Must Include Fact B"],
            count: 2
          }),
          usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 8 }
        };
      }
      return {
        text: JSON.stringify({
          factConsistency: 9,
          hookStrength: 8,
          narrativeFlow: 8,
          curiosityFactor: 9,
          sectionBalance: 7,
          conclusionQuality: 8,
          unsupportedClaims: 0,
          informationDensity: 9,
          curiosityGap: 8,
          insightDensity: 9,
          insightOriginality: 8,
          factToInsightRatio: 9,
          insightsUsed: 2
        }),
        usageMetadata: { promptTokenCount: 15, candidatesTokenCount: 10 }
      };
    });

    const { observabilityAgent } = await import("../../src/agents/observability");
    const state = {
      userId: "user-test",
      currentTopic: { title: "Test Topic", summary: "A summary" },
      research: [
        { title: "Source 1", content: "Sentence one. Sentence two. Sentence three.", score: 0.9, url: "https://x.com" }
      ],
      wikiResearch: [
        "Wiki sentence one. Wiki sentence two."
      ],
      researchBrief: {
        coreConcepts: ["Concept A"],
        interestingFacts: ["Fact 1", "Fact 2"],
        examples: ["Example 1"],
        controversies: [],
        historicalContext: ["History"],
        recentDevelopments: [],
        articleAngles: [],
        narrativeHooks: [],
        counterintuitiveInsights: [],
        mustIncludeFacts: ["Must Include Fact A", "Must Include Fact B"],
        sectionSuggestions: ["Suggestion 1"]
      },
      outline: {
        title: "Title",
        hook: "Hook",
        sections: [
          { heading: "Intro", purpose: "P1", keyFacts: [], example: "", transition: "", targetWordCount: 150 },
          { heading: "Body", purpose: "P2", keyFacts: [], example: "", transition: "", targetWordCount: 150 }
        ]
      },
      insightBrief: {
        coreInsights: [
          { insight: "Insight 1", whyInteresting: "W1", supportingEvidence: ["Evidence 1"], confidence: "high" },
          { insight: "Insight 2", whyInteresting: "W2", supportingEvidence: ["Evidence 2"], confidence: "medium" }
        ]
      },
      article: "This is a short polished article containing both Must Include Fact A and also Must Include Fact B.",
      userSettings: {},
    } as any;

    const res = await observabilityAgent(state);

    // Expect researchFactCount sentence counts:
    // Source 1 has 3 sentences: "Sentence one", "Sentence two", "Sentence three"
    // Wiki has 2 sentences: "Wiki sentence one", "Wiki sentence two"
    // Total 5 sentences of length > 10.
    expect(res.researchFactCount).toBe(5);

    // Expect briefFactCount: 1 + 2 + 1 + 0 + 1 + 0 + 0 + 0 + 0 + 2 + 1 = 8
    expect(res.briefFactCount).toBe(8);

    expect(res.outlineSectionCount).toBe(2);

    // Word count in article (18 words)
    expect(res.articleWordCount).toBe(18);

    expect(res.researchFactsUsed).toBe(2);

    expect(res.nodeMetrics?.[0].nodeName).toBe("observability");
    expect(res.nodeMetrics?.[0].success).toBe(true);
    expect(res.nodeMetrics?.[0].inputTokens).toBe(27);
    expect(res.nodeMetrics?.[0].outputTokens).toBe(18);
    expect(res.nodeMetrics?.[0].mustIncludeFacts).toBe(2);
    expect(res.nodeMetrics?.[0].mustIncludeFactsUsed).toBe(2);
    expect(res.nodeMetrics?.[0].outlineTargetWords).toBe(300);
    expect(res.nodeMetrics?.[0].actualArticleWords).toBe(18);
    expect(res.nodeMetrics?.[0].factConsistency).toBe(9);
    expect(res.nodeMetrics?.[0].hookStrength).toBe(8);
    expect(res.nodeMetrics?.[0].narrativeFlow).toBe(8);
    expect(res.nodeMetrics?.[0].curiosityFactor).toBe(9);
    expect(res.nodeMetrics?.[0].sectionBalance).toBe(7);
    expect(res.nodeMetrics?.[0].conclusionQuality).toBe(8);
    expect(res.nodeMetrics?.[0].unsupportedClaims).toBe(0);
    expect(res.nodeMetrics?.[0].informationDensity).toBe(9);
    expect(res.nodeMetrics?.[0].curiosityGap).toBe(8);
    expect(res.nodeMetrics?.[0].insightDensity).toBe(9);
    expect(res.nodeMetrics?.[0].insightOriginality).toBe(8);
    expect(res.nodeMetrics?.[0].factToInsightRatio).toBe(9);
    expect(res.nodeMetrics?.[0].insightsGenerated).toBe(2);
    expect(res.nodeMetrics?.[0].insightsUsed).toBe(2);
    expect(res.insightsGenerated).toBe(2);
    expect(res.insightsUsed).toBe(2);
  });
});
