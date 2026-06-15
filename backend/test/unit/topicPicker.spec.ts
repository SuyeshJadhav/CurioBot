import { describe, it, expect, vi } from "vitest";

describe("topicPickerAgent JSON parsing", () => {
  it("parses valid JSON array from Gemini", async () => {
    const gemini = await import("../../src/lib/gemini");
    // Mock generateContent to return a clean JSON array string
    (gemini.ai.models.generateContent as any).mockResolvedValueOnce({
      text: JSON.stringify([
        {
          title: "T1",
          angle: "angle1",
          category: "science",
          hook: "hook1",
          connections: [],
        }
      ]),
      usageMetadata: {},
    });

    const memory = await import("../../src/lib/memory");
    memory.getAllInterests = vi.fn(async () => [{ interest: "science" }]);

    const { topicPickerAgent } = await import("../../src/agents/topicPicker");
    const state = {
      userId: "user-1",
      seenTopics: [],
      userSettings: {},
      interests: [],
    } as any;
    const res = await topicPickerAgent(state);
    expect(res.candidates).toBeTruthy();
    expect(res.candidates!.length).toBeGreaterThan(0);
    expect(res.candidates![0].title).toBe("T1");
  });

  it("parses JSON wrapped in markdown fences", async () => {
    const gemini = await import("../../src/lib/gemini");
    (gemini.ai.models.generateContent as any).mockResolvedValueOnce({
      text:
        "```json\n" +
        JSON.stringify([
          {
            title: "T2",
            angle: "angle2",
            category: "history",
            hook: "hook2",
            connections: [],
          }
        ]) +
        "\n```",
      usageMetadata: {},
    });

    const memory = await import("../../src/lib/memory");
    memory.getAllInterests = vi.fn(async () => [{ interest: "history" }]);

    const { topicPickerAgent } = await import("../../src/agents/topicPicker");
    const state = {
      userId: "user-1",
      seenTopics: [],
      userSettings: {},
      interests: [],
    } as any;
    const res = await topicPickerAgent(state);
    expect(res.candidates).toBeTruthy();
    expect(res.candidates![0].title).toBe("T2");
  });

  it("falls back on malformed JSON", async () => {
    const gemini = await import("../../src/lib/gemini");
    (gemini.ai.models.generateContent as any).mockResolvedValue({
      text: "not json",
      usageMetadata: {},
    });

    const memory = await import("../../src/lib/memory");
    memory.getAllInterests = vi.fn(async () => [{ interest: "fallback" }]);

    const { topicPickerAgent } = await import("../../src/agents/topicPicker");
    const state = {
      userId: "user-1",
      seenTopics: [],
      userSettings: {},
      interests: [],
    } as any;
    const res = await topicPickerAgent(state);
    expect(res.candidates).toBeTruthy();
    expect(res.candidates!.length).toBeGreaterThan(0);
    expect(res.candidates![0].title).toBeDefined();
  });
});
