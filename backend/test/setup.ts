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
      const props = args?.config?.responseSchema?.properties || {};
      const schema = args?.config?.responseSchema || {};

      if (schema.type === "array") {
        const itemProps = schema.items?.properties || {};
        if (itemProps.novelty !== undefined) {
          // Curiosity Scorer mock
          return {
            text: JSON.stringify([
              {
                title: "Mock Topic 1",
                novelty: 9,
                specificity: 8,
                surprise: 9,
                mechanism: 8,
                rabbitHolePotential: 7,
                primaryQuestion: "Why does Mock Topic 1 exist?",
                winningCandidateReason: "It is extremely novel."
              },
              {
                title: "Mock Topic 2",
                novelty: 7,
                specificity: 7,
                surprise: 8,
                mechanism: 9,
                rabbitHolePotential: 8,
                primaryQuestion: "How does Mock Topic 2 work?",
                winningCandidateReason: "It has a strong mechanism."
              }
            ]),
            usageMetadata: {},
          };
        }
        
        // Topic Picker mock
        return {
          text: JSON.stringify([
            {
              title: "Mock Topic 1",
              angle: "A surprising hook about Mock Topic 1",
              category: "science",
              hook: "A compelling hook for Mock Topic 1",
              connections: ["connection1"]
            },
            {
              title: "Mock Topic 2",
              angle: "A surprising hook about Mock Topic 2",
              category: "history",
              hook: "A compelling hook for Mock Topic 2",
              connections: ["connection2"]
            }
          ]),
          usageMetadata: {},
        };
      }

      if (props.rabbit_holes !== undefined) {
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

      if (props.coreConcepts !== undefined) {
        return {
          text: JSON.stringify({
            coreConcepts: ["Mock Core Concept"],
            interestingFacts: ["Mock Interesting Fact"],
            examples: ["Mock Example"],
            controversies: ["Mock Controversy"],
            historicalContext: ["Mock Historical Context"],
            recentDevelopments: ["Mock Recent Development"],
            articleAngles: ["Mock Article Angle"],
            narrativeHooks: ["Mock Narrative Hook"],
            counterintuitiveInsights: ["Mock Counterintuitive Insight"],
            mustIncludeFacts: ["Mock Must Include Fact"],
            sectionSuggestions: ["Mock Section Suggestion"],
            premiseNotes: [],
            primaryAngle: "Why railway accidents created time zones",
            forbiddenAngles: ["general history of clocks"],
            primaryQuestion: "Why did railway accidents create time zones?",
            winningCandidateReason: "It connects accidents to time zones."
          }),
          usageMetadata: {},
        };
      }

      if (props.sections !== undefined) {
        return {
          text: JSON.stringify({
            title: "The Ultimate Guide",
            hook: "Did you know this interesting fact?",
            sections: [
              { 
                heading: "Introduction", 
                purpose: "Cover the basics.",
                keyFacts: ["Fact A"],
                example: "Example A",
                transition: "Transition A"
              },
              { 
                heading: "Advanced Topics", 
                purpose: "Deep dive.",
                keyFacts: ["Fact B"],
                example: "Example B",
                transition: "Transition B"
              },
              { 
                heading: "Examples", 
                purpose: "Real-world cases.",
                keyFacts: ["Fact C"],
                example: "Example C",
                transition: "Transition C"
              },
              { 
                heading: "Limitations", 
                purpose: "Challenges faced.",
                keyFacts: ["Fact D"],
                example: "Example D",
                transition: "Transition D"
              }
            ]
          }),
          usageMetadata: {},
        };
      }

      if (props.editedArticle !== undefined) {
        return {
          text: JSON.stringify({
            editedArticle: "This is the edited article.",
            editorNotes: {
              factCorrections: 1,
              sectionsExpanded: 0,
              sectionsCompressed: 0,
              transitionsImproved: 2,
              hookStrengthened: true
            }
          }),
          usageMetadata: {},
        };
      }

      if (props.factConsistency !== undefined) {
        return {
          text: JSON.stringify({
            factConsistency: 9,
            hookStrength: 8,
            narrativeFlow: 8,
            curiosityFactor: 9,
            sectionBalance: 7,
            conclusionQuality: 8,
            unsupportedClaims: 0,
            informationDensity: 9,
            curiosityGap: 8
          }),
          usageMetadata: {},
        };
      }

      if (props.factsUsed !== undefined) {
        return {
          text: JSON.stringify({
            factsUsed: ["Mock Must Include Fact"],
            count: 1
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
          primaryQuestion: "Why did railway accidents create time zones?",
          winningCandidateReason: "It connects accidents to time zones."
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
