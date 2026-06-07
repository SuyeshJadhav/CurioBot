import { describe, it, expect, vi } from "vitest";

// Unmock the mcp module to test the actual implementation instead of the global mock defined in setup.ts
vi.unmock("../../src/lib/mcp");

describe("CurioBot Issue Resolutions", () => {
  it("dedupTopicNode logs the similarity score when a duplicate is found", async () => {
    const memory = await import("../../src/lib/memory");
    memory.matchSeenTopics = vi.fn(async () => [
      { topic: "CRISPR gene editing", similarity: 0.88 },
    ]);

    const { dedupTopicNode } = await import("../../src/agents/dedupTopic");

    const state = {
      userId: "user-123",
      currentTopic: { title: "CRISPR gene editing explained" },
      topicEmbedding: [0.1, 0.2, 0.3],
      dedupAttempts: 0,
    } as any;

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const result = await dedupTopicNode(state);

    expect(result.dedupPassed).toBe(false);
    expect(result.dedupAttempts).toBe(1);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("similarity: 0.8800"));
    consoleSpy.mockRestore();
  });

  it("wonder pool generation route skips wonder pool when user preferences do not match", async () => {
    vi.resetModules();
    const mockUserSettings = {
      knowledge_level: "beginner", // Mismatch (requires intermediate)
      topic_novelty: "mixed",
    };

    vi.doMock("../../src/lib/db", () => ({
      getDailyWonder: vi.fn(async () => null),
      getUserSettings: vi.fn(async () => mockUserSettings),
      publishDailyWonder: vi.fn(async () => {}),
      saveArticle: vi.fn(async () => "article-123"),
    }));

    // Mock supervisor to bypass live generation
    vi.doMock("../../src/agents/supervisor", () => ({
      supervisorAgent: vi.fn(async () => ({
        currentTopic: { title: "Live Topic", summary: "summary", domain: "science" },
        articleId: "live-article-123",
        article: "content",
      })),
    }));

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { default: app } = await import("../../server");
    const { generateToken } = await import("../../src/lib/auth");
    const token = generateToken("test-user-settings-mismatch");

    const request = (await import("supertest")).default;
    const res = await request(app)
      .post("/api/wonder/generate")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Personalization mismatch for pool"));
    consoleSpy.mockRestore();
  });

  it("mcp transport cleanup listener triggers process.kill on transport.pid", async () => {
    const killSpy = vi.spyOn(process, "kill").mockImplementation(() => true);

    const mcp = await import("../../src/lib/mcp");

    // Override the pid of the transport instance
    Object.defineProperty(mcp.transport, "pid", {
      get: () => 99999,
      configurable: true,
    });

    // Retrieve the exit listener
    const listeners = process.listeners("exit");
    const exitListener = listeners[listeners.length - 1];

    expect(exitListener).toBeDefined();
    if (exitListener) {
      exitListener(0);
      expect(killSpy).toHaveBeenCalledWith(99999);
    }

    killSpy.mockRestore();
  });
});
