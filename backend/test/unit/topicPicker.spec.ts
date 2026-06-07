import { describe, it, expect, vi } from "vitest";

describe("topicPickerAgent JSON parsing", () => {
  it("parses valid JSON from Gemini", async () => {
    const gemini = await import("../../src/lib/gemini");
    // Mock generateContent to return a clean JSON string
    (gemini.ai.models.generateContent as any).mockResolvedValueOnce({
      text: JSON.stringify({
        id: "t-1",
        title: "T1",
        domain: "science",
        summary: "sum",
        connections: [],
        read: false,
      }),
      usageMetadata: {},
    });

    // Ensure embeddings and memory dedupe allow selection by mocking Gemini embed
    (gemini.ai.models.embedContent as any).mockResolvedValueOnce({
      embeddings: [{ values: [0.1, 0.2] }],
    });
    const memory = await import("../../src/lib/memory");
    memory.getAllInterests = vi.fn(async () => [{ interest: "science" }]);
    memory.matchSeenTopics = vi.fn(async () => []);

    const { topicPickerAgent } = await import("../../src/agents/topicPicker");
    const state = {
      userId: "user-1",
      seenTopics: [],
      userSettings: {},
      interests: [],
    } as any;
    const res = await topicPickerAgent(state);
    expect(res.currentTopic).toBeTruthy();
    expect((res.currentTopic as any).title).toBe("T1");
  });

  it("parses JSON wrapped in markdown fences", async () => {
    const gemini = await import("../../src/lib/gemini");
    (gemini.ai.models.generateContent as any).mockResolvedValueOnce({
      text:
        "```json\n" +
        JSON.stringify({
          id: "t-2",
          title: "T2",
          domain: "history",
          summary: "s",
          connections: [],
          read: false,
        }) +
        "\n```",
      usageMetadata: {},
    });

    (gemini.ai.models.embedContent as any).mockResolvedValueOnce({
      embeddings: [{ values: [0.1, 0.2] }],
    });
    const memory = await import("../../src/lib/memory");
    memory.getAllInterests = vi.fn(async () => [{ interest: "history" }]);
    memory.matchSeenTopics = vi.fn(async () => []);

    const { topicPickerAgent } = await import("../../src/agents/topicPicker");
    const state = {
      userId: "user-1",
      seenTopics: [],
      userSettings: {},
      interests: [],
    } as any;
    const res = await topicPickerAgent(state);
    expect(res.currentTopic).toBeTruthy();
    expect((res.currentTopic as any).title).toBe("T2");
  });

  it("falls back on malformed JSON", async () => {
    const gemini = await import("../../src/lib/gemini");
    (gemini.ai.models.generateContent as any).mockResolvedValue({
      text: "not json",
      usageMetadata: {},
    });

    (gemini.ai.models.embedContent as any).mockResolvedValue({
      embeddings: [{ values: [0.1, 0.2] }],
    });
    const memory = await import("../../src/lib/memory");
    memory.getAllInterests = vi.fn(async () => [{ interest: "fallback" }]);
    memory.matchSeenTopics = vi.fn(async () => []);

    const { topicPickerAgent } = await import("../../src/agents/topicPicker");
    const state = {
      userId: "user-1",
      seenTopics: [],
      userSettings: {},
      interests: [],
    } as any;
    const res = await topicPickerAgent(state);
    expect(res.currentTopic).toBeTruthy();
    // fallback id from module
    expect((res.currentTopic as any).id).toBeDefined();
  });

  it("returns a structured error when Gemini returns empty text", async () => {
    const gemini = await import("../../src/lib/gemini");
    (gemini.ai.models.generateContent as any).mockResolvedValue({
      text: "",
      usageMetadata: {},
    });

    (gemini.ai.models.embedContent as any).mockResolvedValue({
      embeddings: [{ values: [0.1, 0.2] }],
    });
    const memory = await import("../../src/lib/memory");
    memory.getAllInterests = vi.fn(async () => [{ interest: "fallback" }]);
    memory.matchSeenTopics = vi.fn(async () => []);

    const { topicPickerAgent } = await import("../../src/agents/topicPicker");
    const state = {
      userId: "user-1",
      seenTopics: [],
      userSettings: {},
      interests: [],
    } as any;

    await expect(topicPickerAgent(state)).rejects.toMatchObject({
      name: "AppError",
      statusCode: 502,
    });
  });
});
