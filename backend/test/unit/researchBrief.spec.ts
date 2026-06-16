import { describe, it, expect } from "vitest";

describe("researchBriefAgent", () => {
  it("compiles a structured research brief from state research content", async () => {
    const gemini = await import("../../src/lib/gemini");

    (gemini.ai.models.generateContent as any).mockImplementation(async () => {
      return {
        text: JSON.stringify({
          coreConcepts: ["Concept A", "Concept B"],
          interestingFacts: ["Fact X", "Fact Y"],
          examples: ["Example 1"],
          controversies: ["Controversy A"],
          historicalContext: ["History details"],
          recentDevelopments: ["Recent updates"],
          articleAngles: ["Educational Angle"],
          narrativeHooks: ["Engaging hook"],
          counterintuitiveInsights: ["Insight A"],
          mustIncludeFacts: ["Fact X must be included"],
          sectionSuggestions: ["Section 1", "Section 2"],
          premiseNotes: [],
          primaryAngle: "Why railway accidents created time zones",
          forbiddenAngles: ["general history of clocks"],
          primaryQuestion: "Why did railway accidents create time zones?",
          winningCandidateReason: "It connects accidents to time zones."
        }),
        usageMetadata: { promptTokenCount: 15, candidatesTokenCount: 10 }
      };
    });

    const { researchBriefAgent } = await import("../../src/agents/researchBrief");
    const state = {
      userId: "user-test",
      currentTopic: { title: "Test Topic", summary: "A summary", angle: "Seed Angle", primaryQuestion: "Seed Question", winningCandidateReason: "Seed Reason" },
      research: [
        { title: "Source 1", content: "Some content with information.", score: 0.9, url: "https://x.com" }
      ],
      wikiResearch: [],
      userSettings: {},
    } as any;

    const res = await researchBriefAgent(state);

    expect(res.researchBrief).toEqual({
      coreConcepts: ["Concept A", "Concept B"],
      interestingFacts: ["Fact X", "Fact Y"],
      examples: ["Example 1"],
      controversies: ["Controversy A"],
      historicalContext: ["History details"],
      recentDevelopments: ["Recent updates"],
      articleAngles: ["Educational Angle"],
      narrativeHooks: ["Engaging hook"],
      counterintuitiveInsights: ["Insight A"],
      mustIncludeFacts: ["Fact X must be included"],
      sectionSuggestions: ["Section 1", "Section 2"],
      premiseNotes: [],
      primaryAngle: "Why railway accidents created time zones",
      forbiddenAngles: ["general history of clocks"],
      primaryQuestion: "Why did railway accidents create time zones?",
      winningCandidateReason: "It connects accidents to time zones."
    });
    expect(res.nodeMetrics).toBeDefined();
    expect(res.nodeMetrics?.[0].nodeName).toBe("research_brief");
    expect(res.nodeMetrics?.[0].success).toBe(true);
    expect(res.nodeMetrics?.[0].inputTokens).toBe(15);
    expect(res.nodeMetrics?.[0].outputTokens).toBe(10);
  });

  it("gracefully falls back on generation failure", async () => {
    const gemini = await import("../../src/lib/gemini");
    (gemini.ai.models.generateContent as any).mockImplementation(async () => {
      throw new Error("Gemini Limit Reached");
    });

    const { researchBriefAgent } = await import("../../src/agents/researchBrief");
    const state = {
      userId: "user-test",
      currentTopic: { title: "Test Topic", summary: "A summary", angle: "Seed Angle", primaryQuestion: "Seed Question", winningCandidateReason: "Seed Reason" },
      research: [],
      wikiResearch: [],
      userSettings: {},
    } as any;

    const res = await researchBriefAgent(state);

    expect(res.researchBrief).toBeDefined();
    expect(res.researchBrief?.coreConcepts.length).toBeGreaterThan(0);
    expect(res.researchBrief?.mustIncludeFacts.length).toBeGreaterThan(0);
    expect(res.researchBrief?.premiseNotes).toEqual([]);
    expect(res.nodeMetrics?.[0].nodeName).toBe("research_brief");
    expect(res.nodeMetrics?.[0].success).toBe(true);
  });

  it("includes premise corrections in premiseNotes when researchSummary is present", async () => {
    const gemini = await import("../../src/lib/gemini");

    (gemini.ai.models.generateContent as any).mockImplementation(async ({ contents }: any) => {
      const promptText = contents[0]?.parts[0]?.text || "";
      expect(promptText).toContain("=== RESEARCH SUMMARY (HIGH PRIORITY) ===");
      expect(promptText).toContain("There is no historical connection between Tulip Mania and global time standardization.");
      expect(promptText).toContain("Treat the Research Summary as the authoritative synthesis");

      return {
        text: JSON.stringify({
          coreConcepts: ["Concept A"],
          interestingFacts: [],
          examples: [],
          controversies: [],
          historicalContext: [],
          recentDevelopments: [],
          articleAngles: [],
          narrativeHooks: [],
          counterintuitiveInsights: [],
          mustIncludeFacts: [],
          sectionSuggestions: [],
          premiseNotes: ["No historical evidence links Tulip Mania to global time standardization."],
          primaryAngle: "Refined Angle",
          forbiddenAngles: [],
          primaryQuestion: "Core question?",
          winningCandidateReason: "Reason"
        }),
        usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 5 }
      };
    });

    const { researchBriefAgent } = await import("../../src/agents/researchBrief");
    const state = {
      userId: "user-test",
      currentTopic: { title: "Test Topic", summary: "A summary", angle: "Seed Angle", primaryQuestion: "Seed Question", winningCandidateReason: "Seed Reason" },
      research: [],
      wikiResearch: [],
      researchSummary: "There is no historical connection between Tulip Mania and global time standardization.",
      userSettings: {},
    } as any;

    const res = await researchBriefAgent(state);

    expect(res.researchBrief?.premiseNotes).toEqual([
      "No historical evidence links Tulip Mania to global time standardization."
    ]);
  });

  it("returns empty premiseNotes when researchSummary contains no corrections", async () => {
    const gemini = await import("../../src/lib/gemini");

    (gemini.ai.models.generateContent as any).mockImplementation(async () => {
      return {
        text: JSON.stringify({
          coreConcepts: ["Concept A"],
          interestingFacts: [],
          examples: [],
          controversies: [],
          historicalContext: [],
          recentDevelopments: [],
          articleAngles: [],
          narrativeHooks: [],
          counterintuitiveInsights: [],
          mustIncludeFacts: [],
          sectionSuggestions: [],
          premiseNotes: [],
          primaryAngle: "Refined Angle",
          forbiddenAngles: [],
          primaryQuestion: "Core question?",
          winningCandidateReason: "Reason"
        }),
        usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 5 }
      };
    });

    const { researchBriefAgent } = await import("../../src/agents/researchBrief");
    const state = {
      userId: "user-test",
      currentTopic: { title: "Test Topic", summary: "A summary", angle: "Seed Angle", primaryQuestion: "Seed Question", winningCandidateReason: "Seed Reason" },
      research: [],
      wikiResearch: [],
      researchSummary: "Standard normal summary without corrections.",
      userSettings: {},
    } as any;

    const res = await researchBriefAgent(state);

    expect(res.researchBrief?.premiseNotes).toEqual([]);
  });
});
