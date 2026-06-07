import { describe, it, expect, vi } from "vitest";

describe("wikiResearcherAgent", () => {
  it("returns an empty wikiResearch array when MCP search yields no text", async () => {
    const gemini = await import("../../src/lib/gemini");

    (gemini.ai.models.generateContent as any)
      .mockResolvedValueOnce({
        candidates: [
          {
            content: { parts: [{ text: "fallback please" }] },
          },
        ],
        usageMetadata: {},
      })
      .mockResolvedValueOnce({
        candidates: [],
        usageMetadata: {},
      });

    vi.doMock("../../src/lib/mcp", () => ({
      initWikiMcp: vi.fn(async () => ({
        geminiTools: [{ name: "wiki_search", description: "", parameters: {} }],
      })),
      executeWikiTool: vi.fn(async () => ({ rawResult: null, text: "" })),
    }));

    const { wikiResearcherAgent } =
      await import("../../src/agents/wikiResearcher");
    const state = {
      currentTopic: { title: "Test topic" },
      userSettings: {},
    } as any;

    const res = await wikiResearcherAgent(state);
    expect(res.wikiResearch).toEqual([]);
  });
});
