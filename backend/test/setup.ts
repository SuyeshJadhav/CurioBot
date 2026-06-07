import { beforeEach, vi } from "vitest";
import { AppError } from "../src/lib/errors";

// Global test setup: reset mocks and modules and provide default module-level mocks
beforeEach(async () => {
  // Reset Vitest mocks and module cache to ensure fresh state each test
  vi.resetAllMocks();
  vi.resetModules();

  // Provide default mocks for external SDKs to avoid real network calls
  vi.mock("../src/lib/gemini", () => {
    const generateContent = vi.fn(async (args: any) => {
      const isWriter = args?.config?.responseSchema?.properties?.rabbit_holes !== undefined;
      if (isWriter) {
        return {
          text: JSON.stringify({
            title: "Mock Topic",
            article: "This is a sufficiently long generated article used for testing the API response body.",
            tldr: "A mock tldr summarizing the mock article.",
            rabbit_holes: [
              { title: "Mock Hole 1", domain: "general", why: "First reason" },
              { title: "Mock Hole 2", domain: "general", why: "Second reason" }
            ]
          }),
          usageMetadata: {},
        };
      }
      return {
        text: JSON.stringify({
          id: "mock-topic",
          title: "Mock Topic",
          domain: "general",
          summary: "A mock topic for tests",
          connections: [],
          read: false,
        }),
        usageMetadata: {},
      };
    });

    const embedContent = vi.fn(async (_: any) => ({
      embeddings: [{ values: [0.1, 0.2, 0.3] }],
    }));

    return {
      ai: { models: { generateContent, embedContent } },
      safetySettings: [] as const,
    };
  });

  vi.mock("../src/lib/tavily", () => ({
    searchWeb: vi.fn(async (query: string) => [
      {
        title: `Result for ${query}`,
        url: `https://example.com/${encodeURIComponent(query)}`,
        content: "excerpt",
        score: 0.9,
      },
    ]),
  }));

  vi.mock("../src/lib/memory", () => ({
    getAllInterests: vi.fn(async (userId: string) => []),
    matchSeenTopics: vi.fn(
      async (_queryEmbedding: any, _userId: string, _threshold?: number) => [],
    ),
    addSeenTopic: vi.fn(async () => {}),
    getUserInterests: vi.fn(async (userId: string) => []),
    addInterest: vi.fn(async () => {}),
    deleteInterest: vi.fn(async () => {}),
  }));

  vi.mock("../src/lib/mcp", () => ({
    initWikiMcp: vi.fn(async () => ({ geminiTools: [] })),
    executeWikiTool: vi.fn(async () => ({ rawResult: {}, text: "wiki text" })),
  }));

  // Default auth middleware mock to bypass JWT checks during tests
  vi.mock("../src/middleware/auth", () => ({
    authenticate: (req: any, _res: any, next: any) => {
      const auth = req.headers?.authorization || req.get?.("authorization");
      if (!auth) return next(new AppError(401, "Unauthorized"));
      req.userId = "test-user";
      return next();
    },
    asyncHandler: (fn: any) => fn,
  }));

  // Simplified supabase mock: fluent API that resolves with default empty data
  vi.mock("../src/lib/supabase", () => {
    class Table {
      table: string;
      constructor(table: string) {
        this.table = table;
      }
      select() {
        return this;
      }
      insert() {
        return this;
      }
      upsert() {
        return this;
      }
      delete() {
        return this;
      }
      update() {
        return this;
      }
      eq() {
        return this;
      }
      gte() {
        return this;
      }
      order() {
        return this;
      }
      maybeSingle() {
        if (this.table === "user_settings") {
          return Promise.resolve({
            data: {
              settings: {
                model: "gemini-3.1-flash-lite",
              },
            },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      }
      single() {
        if (this.table === "articles") {
          return Promise.resolve({ data: { id: "article-1" }, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      }
      rpc() {
        return Promise.resolve({ data: [], error: null });
      }
    }

    const proxy = new Proxy(
      {},
      {
        get: (_target, prop) => {
          if (prop === "from") return (table: string) => new Table(table);
          return undefined;
        },
      },
    );

    return { default: proxy };
  });

  // Clear concurrency locks if present
  try {
    const rateLimiter = await import("../src/middleware/rateLimiter");
    if (rateLimiter && rateLimiter.activeGenerations) {
      for (const [, v] of rateLimiter.activeGenerations) {
        try {
          clearTimeout(v.timer);
        } catch {}
      }
      rateLimiter.activeGenerations.clear();
    }
  } catch (e) {
    // ignore if module cannot be imported in this phase
  }
});
