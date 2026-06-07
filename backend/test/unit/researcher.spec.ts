import { describe, it, expect, vi } from "vitest";

describe("researcherAgent", () => {
  it("stops at the configured MAX_SEARCHES", async () => {
    const gemini = await import("../../src/lib/gemini");
    const tavily = await import("../../src/lib/tavily");

    // Make model always request a web_search function call
    (gemini.ai.models.generateContent as any).mockImplementation(async () => ({
      candidates: [
        {
          content: {
            parts: [
              { functionCall: { name: "web_search", args: { query: "q" } } },
            ],
          },
        },
      ],
      usageMetadata: {},
    }));

    const searchSpy = vi.spyOn(tavily, "searchWeb");
    // Keep search resolving to a simple result
    searchSpy.mockResolvedValue([
      { title: "r", url: "u", content: "c", score: 0.9 },
    ]);

    const { researcherAgent } = await import("../../src/agents/researcher");
    const state = {
      userId: "u1",
      currentTopic: { title: "Test" },
      userSettings: {},
    } as any;

    const res = await researcherAgent(state);

    // MAX_SEARCHES in code is 2
    expect(searchSpy).toHaveBeenCalledTimes(2);
    expect(res.research).toBeDefined();
  });

  it("deduplicates URLs across multiple searches", async () => {
    const gemini = await import("../../src/lib/gemini");
    const tavily = await import("../../src/lib/tavily");

    // model asks for web_search twice
    (gemini.ai.models.generateContent as any).mockImplementation(async () => ({
      candidates: [
        {
          content: {
            parts: [
              { functionCall: { name: "web_search", args: { query: "q" } } },
            ],
          },
        },
      ],
      usageMetadata: {},
    }));

    // First call returns urls a,b; second call returns b,c
    let call = 0;
    vi.spyOn(tavily, "searchWeb").mockImplementation(async () => {
      call++;
      if (call === 1)
        return [
          { title: "A", url: "https://a.test", content: "a", score: 0.9 },
          { title: "B", url: "https://b.test", content: "b", score: 0.8 },
        ];
      return [
        { title: "B2", url: "https://b.test", content: "b2", score: 0.7 },
        { title: "C", url: "https://c.test", content: "c", score: 0.6 },
      ];
    });

    const { researcherAgent } = await import("../../src/agents/researcher");
    const state = {
      userId: "u1",
      currentTopic: { title: "Test" },
      userSettings: {},
    } as any;

    const res = await researcherAgent(state);
    const urls = (res.research || []).map((r: any) => r.url);
    // Should contain unique urls a, b, c
    expect(new Set(urls).size).toBe(3);
  });

  it("handles Tavily network errors without crashing", async () => {
    const gemini = await import("../../src/lib/gemini");
    const tavily = await import("../../src/lib/tavily");

    (gemini.ai.models.generateContent as any).mockImplementation(async () => ({
      candidates: [
        {
          content: {
            parts: [
              { functionCall: { name: "web_search", args: { query: "q" } } },
            ],
          },
        },
      ],
      usageMetadata: {},
    }));

    vi.spyOn(tavily, "searchWeb").mockImplementation(async () => {
      throw new Error("Network failure");
    });

    const { researcherAgent } = await import("../../src/agents/researcher");
    const state = {
      userId: "u1",
      currentTopic: { title: "Test" },
      userSettings: {},
    } as any;

    const res = await researcherAgent(state);
    // Should return gracefully with research array (possibly empty) and not throw
    expect(res).toBeDefined();
    expect(Array.isArray(res.research)).toBe(true);
  });
});
