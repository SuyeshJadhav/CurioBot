import { describe, it, expect } from "vitest";

describe("outlineAgent", () => {
  it("extracts key facts and generates a structured outline (fallback mode when researchBrief is missing)", async () => {
    const gemini = await import("../../src/lib/gemini");

    let callCount = 0;
    (gemini.ai.models.generateContent as any).mockImplementation(
      async (_args: any) => {
        callCount++;
        if (callCount === 1) {
          // Key facts extraction response
          return {
            text: JSON.stringify({
              facts: [
                "Fact 1: First important historical moment.",
                "Fact 2: Second scientific discovery."
              ]
            }),
            usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 }
          };
        } else {
          // Outline generation response
          return {
            text: JSON.stringify({
              title: "The Ultimate Guide",
              hook: "Did you know this interesting fact?",
              sections: [
                { heading: "Introduction", purpose: "Cover the basics.", centralInsight: "Insight 1", keyFacts: ["Fact 1"], example: "Intro Ex", transition: "Next A", targetWordCount: 150, formattingHint: "Hint 1" },
                { heading: "Advanced Topics", purpose: "Deep dive.", centralInsight: "Insight 2", keyFacts: ["Fact 2"], example: "Deep Ex", transition: "Next B", targetWordCount: 150, formattingHint: "Hint 2" },
                { heading: "Examples", purpose: "Real-world cases.", centralInsight: "Insight 3", keyFacts: ["Fact 3"], example: "Real Ex", transition: "Next C", targetWordCount: 150, formattingHint: "Hint 3" },
                { heading: "Limitations", purpose: "Challenges faced.", centralInsight: "Insight 4", keyFacts: ["Fact 4"], example: "Lim Ex", transition: "Next D", targetWordCount: 150, formattingHint: "Hint 4" }
              ]
            }),
            usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 15 }
          };
        }
      }
    );

    const { outlineAgent } = await import("../../src/agents/outline");
    const state = {
      userId: "u1",
      currentTopic: { title: "Test Topic", summary: "A test topic summary" },
      research: [],
      wikiResearch: [],
      userSettings: {},
    } as any;

    const res = await outlineAgent(state);

    expect(res.keyFacts).toEqual([
      "Fact 1: First important historical moment.",
      "Fact 2: Second scientific discovery."
    ]);
    expect(res.outline).toEqual({
      title: "The Ultimate Guide",
      hook: "Did you know this interesting fact?",
      sections: [
        { heading: "Introduction", purpose: "Cover the basics.", centralInsight: "Insight 1", keyFacts: ["Fact 1"], example: "Intro Ex", transition: "Next A", targetWordCount: 150, formattingHint: "Hint 1" },
        { heading: "Advanced Topics", purpose: "Deep dive.", centralInsight: "Insight 2", keyFacts: ["Fact 2"], example: "Deep Ex", transition: "Next B", targetWordCount: 150, formattingHint: "Hint 2" },
        { heading: "Examples", purpose: "Real-world cases.", centralInsight: "Insight 3", keyFacts: ["Fact 3"], example: "Real Ex", transition: "Next C", targetWordCount: 150, formattingHint: "Hint 3" },
        { heading: "Limitations", purpose: "Challenges faced.", centralInsight: "Insight 4", keyFacts: ["Fact 4"], example: "Lim Ex", transition: "Next D", targetWordCount: 150, formattingHint: "Hint 4" }
      ]
    });
    expect(res.nodeMetrics).toBeDefined();
    expect(res.nodeMetrics?.[0].nodeName).toBe("outline");
    expect(res.nodeMetrics?.[0].inputTokens).toBe(30);
    expect(res.nodeMetrics?.[0].outputTokens).toBe(20);
  });

  it("bypasses key facts extraction and uses researchBrief directly when present in state", async () => {
    const gemini = await import("../../src/lib/gemini");

    let callCount = 0;
    (gemini.ai.models.generateContent as any).mockImplementation(
      async (_args: any) => {
        callCount++;
        // Outline generation response only (key facts should be bypassed!)
        return {
          text: JSON.stringify({
            title: "Outline Title",
            hook: "Outline Hook",
            sections: [
              { heading: "Section 1", purpose: "P1", centralInsight: "Insight 1", keyFacts: ["Fact 1"], example: "Ex 1", transition: "T1", targetWordCount: 150, formattingHint: "Hint 1" },
              { heading: "Section 2", purpose: "P2", centralInsight: "Insight 2", keyFacts: ["Fact 2"], example: "Ex 2", transition: "T2", targetWordCount: 150, formattingHint: "Hint 2" },
              { heading: "Section 3", purpose: "P3", centralInsight: "Insight 3", keyFacts: ["Fact 3"], example: "Ex 3", transition: "T3", targetWordCount: 150, formattingHint: "Hint 3" },
              { heading: "Section 4", purpose: "P4", centralInsight: "Insight 4", keyFacts: ["Fact 4"], example: "Ex 4", transition: "T4", targetWordCount: 150, formattingHint: "Hint 4" }
            ]
          }),
          usageMetadata: { promptTokenCount: 15, candidatesTokenCount: 12 }
        };
      }
    );

    const { outlineAgent } = await import("../../src/agents/outline");
    const state = {
      userId: "u1",
      currentTopic: { title: "Topic with Brief", summary: "Summary" },
      research: [],
      wikiResearch: [],
      researchBrief: {
        coreConcepts: ["Concept A"],
        interestingFacts: ["Fact 1"],
        examples: ["Example A"],
        controversies: [],
        historicalContext: [],
        recentDevelopments: [],
        articleAngles: [],
        narrativeHooks: [],
        counterintuitiveInsights: [],
        mustIncludeFacts: ["Fact 1"],
        sectionSuggestions: []
      },
      insightBrief: {
        coreInsights: [
          { insight: "Insight 1", whyInteresting: "Interesting 1", supportingEvidence: ["Evidence 1"], confidence: "high" }
        ]
      },
      userSettings: {},
    } as any;

    const res = await outlineAgent(state);

    expect(callCount).toBe(1); // Bypassed step 1!
    expect(res.keyFacts).toBeUndefined(); // Key facts not extracted
    expect(res.outline).toBeDefined();
    expect(res.outline?.title).toBe("Outline Title");
    expect(res.outline?.sections[0].keyFacts).toEqual(["Fact 1"]);
    expect(res.nodeMetrics?.[0].inputTokens).toBe(15);
  });

  it("gracefully falls back on generation failure", async () => {
    const gemini = await import("../../src/lib/gemini");
    (gemini.ai.models.generateContent as any).mockImplementation(async () => {
      throw new Error("API Limit Reached");
    });

    const { outlineAgent } = await import("../../src/agents/outline");
    const state = {
      userId: "u1",
      currentTopic: { title: "Failed Topic", summary: "Failed summary" },
      userSettings: {},
    } as any;

    const res = await outlineAgent(state);

    expect(res.outline).toBeDefined();
    expect(res.outline?.title).toBe("Failed Topic");
    expect(res.outline?.sections.length).toBe(4);
    expect(res.outline?.sections[0].keyFacts).toBeDefined();
    expect(res.nodeMetrics?.[0].success).toBe(true); // Should return success true with fallback outline
  });
});
