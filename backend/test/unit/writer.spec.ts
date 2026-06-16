import { describe, it, expect, vi } from "vitest";

describe("writerAgent", () => {
  it("includes user preferences inside XML tags in the prompt", async () => {
    const gemini = await import("../../src/lib/gemini");

    let capturedContents: any = null;
    (gemini.ai.models.generateContent as any).mockImplementation(
      async (args: any) => {
        capturedContents = args?.contents;
        return { text: "DUMMY ARTICLE", usageMetadata: {} };
      },
    );

    const { writerAgent } = await import("../../src/agents/writer");
    const state = {
      userId: "u1",
      currentTopic: { title: "Topic" },
      research: [],
      wikiResearch: [],
      researchSummary: undefined,
      insightBrief: {
        coreInsights: [
          { insight: "Insight 1", whyInteresting: "Interesting 1", supportingEvidence: ["Evidence 1"], confidence: "high" }
        ]
      },
      userSettings: {
        knowledge_level: "intermediate",
        model: "m",
      },
    } as any;

    await writerAgent(state);

    const prompt = capturedContents?.[0]?.parts?.[0]?.text as string;
    expect(prompt).toBeTruthy();
    expect(prompt).toContain("<user_preferences>");
    expect(prompt).toContain("<knowledge_level_guide>");
  });

  it("cleanArticleContent strips code fences", async () => {
    const { cleanArticleContent } = await import("../../src/agents/writer");
    const raw = "```markdown\n<article>hello</article>\n```";
    const cleaned = cleanArticleContent(raw);
    expect(cleaned).toBe("<article>hello</article>");
  });

  it("returns cleaned article from API response", async () => {
    const gemini = await import("../../src/lib/gemini");
    (gemini.ai.models.generateContent as any).mockResolvedValue({
      text: "```\nARTICLE BODY\n```",
      usageMetadata: {},
    });

    const { writerAgent } = await import("../../src/agents/writer");
    const state = {
      userId: "u1",
      currentTopic: { title: "Topic" },
      insightBrief: {
        coreInsights: [
          { insight: "Insight 1", whyInteresting: "Interesting 1", supportingEvidence: ["Evidence 1"], confidence: "high" }
        ]
      },
      userSettings: {},
    } as any;
    const res = await writerAgent(state);
    expect(res.article).toBe("ARTICLE BODY");
  });
});
