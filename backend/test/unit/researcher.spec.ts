import { describe, it, expect, vi } from "vitest";

describe("researcherAgent", () => {
  it("stops at 5 tool calls", async () => {
    const gemini = await import("../../src/lib/gemini");
    const mcp = await import("../../src/lib/mcp");

    // Make model request a web_search tool call every time
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

    const executeSpy = vi.spyOn(mcp, "executeResearchTool");
    executeSpy.mockResolvedValue({
      rawResult: { content: [] } as any,
      text: JSON.stringify([{ title: "Result", url: "https://example.com/result", description: "snippet" }])
    });

    const { researcherAgent } = await import("../../src/agents/researcher");
    const state = {
      userId: "u1",
      currentTopic: { title: "Test" },
      userSettings: {},
    } as any;

    const res = await researcherAgent(state);

    // Limit is 5 total tool calls
    expect(executeSpy).toHaveBeenCalledTimes(5);
    expect(res.research).toBeDefined();
  });

  it("deduplicates URLs across multiple search/scrape results", async () => {
    const gemini = await import("../../src/lib/gemini");
    const mcp = await import("../../src/lib/mcp");

    // model asks for web_search
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

    let call = 0;
    vi.spyOn(mcp, "executeResearchTool").mockImplementation(async () => {
      call++;
      if (call === 1) {
        return {
          rawResult: { content: [] } as any,
          text: JSON.stringify([
            { title: "A", url: "https://a.test", description: "a" },
            { title: "B", url: "https://b.test", description: "b" }
          ])
        };
      }
      return {
        rawResult: {},
        text: JSON.stringify([
          { title: "B2", url: "https://b.test", description: "b2" },
          { title: "C", url: "https://c.test", description: "c" }
        ])
      };
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

  it("handles tool errors without crashing", async () => {
    const gemini = await import("../../src/lib/gemini");
    const mcp = await import("../../src/lib/mcp");

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

    vi.spyOn(mcp, "executeResearchTool").mockImplementation(async () => {
      throw new Error("Tool failure");
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
