import { describe, it, expect } from "vitest";

describe("supervisor pipeline integration", () => {
  it(
    "runs supervisorAgent and returns topic, research, and article",
    async () => {
      const { supervisorAgent } = await import("../../src/agents/supervisor");

      const res = await supervisorAgent(["science"], "test-user");

      // Ensure topic picker succeeded (non-fallback should have an embedding)
      expect(res.currentTopic).toBeDefined();
      const topicEmbedding = (res as any).topicEmbedding ?? [];
      expect(Array.isArray(topicEmbedding)).toBe(true);
      expect(topicEmbedding.length).toBeGreaterThan(0);

      // Ensure researchers ran and produced arrays
      expect(Array.isArray(res.research)).toBe(true);
      expect(Array.isArray(res.wikiResearch)).toBe(true);

      // Writer should have produced an article string and DB save should have returned an id
      expect(typeof res.article).toBe("string");
      const article = (res as any).article ?? "";
      expect(article.length).toBeGreaterThan(20);
      const articleId = (res as any).articleId ?? "";
      expect(typeof articleId).toBe("string");
      expect(articleId).toBe("article-1");
    },
    { timeout: 20000 },
  );
});
