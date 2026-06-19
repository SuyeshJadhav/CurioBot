import { describe, it, expect, vi } from "vitest";

describe("dedupTopicNode", () => {
  it("bypasses deduplication if requestedTopic is defined", async () => {
    const { dedupTopicNode } = await import("../../src/agents/dedupTopic");
    const state = {
      currentTopic: { title: "Requested Topic" },
      requestedTopic: { title: "Requested Topic" },
    } as any;

    const res = await dedupTopicNode(state);
    expect(res.dedupPassed).toBe(true);
  });

  it("handles empty embedding by skipping dedup check", async () => {
    const { dedupTopicNode } = await import("../../src/agents/dedupTopic");
    const state = {
      currentTopic: { title: "Some Topic" },
      topicEmbedding: undefined,
    } as any;

    const res = await dedupTopicNode(state);
    expect(res.dedupPassed).toBe(true);
  });

  it("dynamically adjusts similarity threshold based on dedupAttempts", async () => {
    const memory = await import("../../src/lib/memory");
    const { dedupTopicNode } = await import("../../src/agents/dedupTopic");

    // Track thresholds passed to matchSeenTopics
    const thresholds: number[] = [];
    vi.spyOn(memory, "matchSeenTopics").mockImplementation(
      async (_embedding: number[], _userId: string, threshold?: number) => {
        thresholds.push(threshold ?? 0.85);
        return [];
      }
    );

    // Attempt 0: threshold should be 0.79
    const res0 = await dedupTopicNode({
      currentTopic: { title: "Topic A" },
      topicEmbedding: [0.1, 0.2, 0.3],
      userId: "user-1",
      dedupAttempts: 0,
    } as any);
    expect(res0.dedupPassed).toBe(true);
    expect(thresholds[0]).toBe(0.79);

    // Attempt 1: threshold should be 0.81
    const res1 = await dedupTopicNode({
      currentTopic: { title: "Topic B" },
      topicEmbedding: [0.1, 0.2, 0.3],
      userId: "user-1",
      dedupAttempts: 1,
    } as any);
    expect(res1.dedupPassed).toBe(true);
    expect(thresholds[1]).toBe(0.81);

    // Attempt 2: threshold should be 0.82
    const res2 = await dedupTopicNode({
      currentTopic: { title: "Topic C" },
      topicEmbedding: [0.1, 0.2, 0.3],
      userId: "user-1",
      dedupAttempts: 2,
    } as any);
    expect(res2.dedupPassed).toBe(true);
    expect(thresholds[2]).toBe(0.82);
  });

  it("marks dedupPassed as false and returns matched topics if duplicates are found", async () => {
    const memory = await import("../../src/lib/memory");
    const { dedupTopicNode } = await import("../../src/agents/dedupTopic");

    vi.spyOn(memory, "matchSeenTopics").mockResolvedValueOnce([
      { topic: "Similar Old Topic", similarity: 0.83 },
    ]);

    const state = {
      currentTopic: { title: "Fresh Topic Concept" },
      topicEmbedding: [0.1, 0.2, 0.3],
      userId: "user-1",
      dedupAttempts: 0,
    } as any;

    const res = await dedupTopicNode(state);
    expect(res.dedupPassed).toBe(false);
    expect(res.dedupAttempts).toBe(1);
    expect(res.currentTopic).toBeUndefined();
    expect(res.topicEmbedding).toBeUndefined();
    expect(res.seenTopics).toContain("Similar Old Topic");
  });
});
