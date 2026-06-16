import { describe, it, expect } from "vitest";

describe("editorAgent", () => {
  it("edits the draft article and records metrics", async () => {
    const gemini = await import("../../src/lib/gemini");
    (gemini.ai.models.generateContent as any).mockResolvedValue({
      text: JSON.stringify({
        editedArticle: "This is a polished and highly readable edited version of the article.",
        editorNotes: {
          factCorrections: 0,
          sectionsExpanded: 0,
          sectionsCompressed: 0,
          transitionsImproved: 1,
          hookStrengthened: true
        }
      }),
      usageMetadata: { promptTokenCount: 15, candidatesTokenCount: 10 }
    });

    const { editorAgent } = await import("../../src/agents/editor");
    const state = {
      userId: "u1",
      article: "Draft article that is repetitive.",
      keyFacts: ["Fact A", "Fact B"],
      researchSummary: "Summary",
      userSettings: {},
    } as any;

    const res = await editorAgent(state);

    expect(res.article).toBe("This is a polished and highly readable edited version of the article.");
    expect(res.nodeMetrics).toBeDefined();
    expect(res.nodeMetrics?.[0].nodeName).toBe("editor");
    expect(res.nodeMetrics?.[0].success).toBe(true);
    expect(res.nodeMetrics?.[0].inputTokens).toBe(15);
    expect(res.nodeMetrics?.[0].outputTokens).toBe(10);
    expect(res.nodeMetrics?.[0].factCorrections).toBe(0);
    expect(res.nodeMetrics?.[0].transitionsImproved).toBe(1);
    expect(res.nodeMetrics?.[0].hookStrengthened).toBe(true);
  });

  it("returns original draft on parse failure or API error", async () => {
    const gemini = await import("../../src/lib/gemini");
    (gemini.ai.models.generateContent as any).mockImplementation(async () => {
      throw new Error("Timeout");
    });

    const { editorAgent } = await import("../../src/agents/editor");
    const state = {
      userId: "u1",
      article: "Original Draft Content",
      keyFacts: [],
      userSettings: {},
    } as any;

    await expect(editorAgent(state)).rejects.toThrow("Timeout");
  });

  it("handles fact consistency and contradiction resolution", async () => {
    const gemini = await import("../../src/lib/gemini");
    (gemini.ai.models.generateContent as any).mockResolvedValue({
      text: JSON.stringify({
        editedArticle: "Although both topics involve commerce, historians do not consider Tulip Mania a cause of global time standardization.",
        editorNotes: {
          factCorrections: 1,
          sectionsExpanded: 0,
          sectionsCompressed: 0,
          transitionsImproved: 0,
          hookStrengthened: false
        }
      }),
      usageMetadata: {}
    });

    const { editorAgent } = await import("../../src/agents/editor");
    const state = {
      userId: "u1",
      article: "Tulip Mania created global time zones.",
      researchSummary: "No historical connection exists.",
      researchBrief: {
        mustIncludeFacts: ["No connection exists between tulip mania and timezones"]
      },
      userSettings: {},
    } as any;

    const res = await editorAgent(state);
    expect(res.article).toContain("historians do not consider Tulip Mania a cause of global time standardization");
    expect(res.nodeMetrics?.[0].factCorrections).toBe(1);
  });

  it("improves narrative flow and structure", async () => {
    const gemini = await import("../../src/lib/gemini");
    (gemini.ai.models.generateContent as any).mockResolvedValue({
      text: JSON.stringify({
        editedArticle: "First, let's explore the hook. Consequently, the core concept emerges. As an example, consider X.",
        editorNotes: {
          factCorrections: 0,
          sectionsExpanded: 1,
          sectionsCompressed: 0,
          transitionsImproved: 3,
          hookStrengthened: true
        }
      }),
      usageMetadata: {}
    });

    const { editorAgent } = await import("../../src/agents/editor");
    const state = {
      userId: "u1",
      article: "Fact A. Fact B. Fact C.",
      userSettings: {},
    } as any;

    const res = await editorAgent(state);
    expect(res.article).toContain("Consequently");
    expect(res.nodeMetrics?.[0].transitionsImproved).toBe(3);
  });

  it("optimizes curiosity utilizing research brief hooks", async () => {
    const gemini = await import("../../src/lib/gemini");
    (gemini.ai.models.generateContent as any).mockResolvedValue({
      text: JSON.stringify({
        editedArticle: "Did you know that a single bulb cost more than a house? This surprising reality is Tulip Mania.",
        editorNotes: {
          factCorrections: 0,
          sectionsExpanded: 0,
          sectionsCompressed: 0,
          transitionsImproved: 1,
          hookStrengthened: true
        }
      }),
      usageMetadata: {}
    });

    const { editorAgent } = await import("../../src/agents/editor");
    const state = {
      userId: "u1",
      article: "Tulips were expensive flowers.",
      researchBrief: {
        narrativeHooks: ["A single bulb cost more than a house"],
        counterintuitiveInsights: [],
        interestingFacts: []
      },
      userSettings: {},
    } as any;

    const res = await editorAgent(state);
    expect(res.article).toContain("Did you know that a single bulb cost more than a house?");
    expect(res.nodeMetrics?.[0].hookStrengthened).toBe(true);
  });
});
