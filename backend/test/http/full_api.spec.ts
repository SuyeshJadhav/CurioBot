import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { AppError } from "../../src/lib/errors";
import { generateToken } from "../../src/lib/auth";

// Each test will set up its own module mocks before importing the app

describe("HTTP API - Full Coverage", () => {
  // --- POST /api/generate tests ---
  it("POST /api/generate - valid auth returns completed payload", async () => {
    vi.resetModules();
    vi.doMock("../../src/middleware/rateLimiter", () => ({
      generalRateLimiter: (_req: any, _res: any, next: any) => next(),
      generateRateLimiter: (_req: any, _res: any, next: any) => next(),
      checkDailyCeiling: (_req: any, _res: any, next: any) => next(),
      checkTokenBalance: (_req: any, _res: any, next: any) => next(),
      acquireLock: (_userId: string) => true,
      releaseLock: (_userId: string) => {},
    }));

    vi.doMock("../../src/agents/supervisor", () => ({
      runSupervisorStream: async (
        _interests: any,
        _userId: any,
        _signal: any,
        _onUpdate: any,
        _stateTracker: any,
      ) => ({
        currentTopic: {
          title: "Generated Topic",
          domain: "science",
          summary: "A short summary",
        },
        topicEmbedding: [0.1, 0.2],
        research: [],
        wikiResearch: [],
        article:
          "This is a sufficiently long generated article used for testing the API response body.",
        nodeMetrics: [],
        articleId: "article-1",
      }),
    }));

    const { default: app } = await import("../../server");
    const token = generateToken("test-user");

    const res = await request(app)
      .post("/api/generate")
      .set("Authorization", `Bearer ${token}`)
      .send({ interests: ["science"] });

    expect(res.status).toBe(200);
    expect(res.text).toContain('"status":"completed"');
    expect(res.text).toContain("article-1");
  });

  it("POST /api/generate - active lock returns 429", async () => {
    vi.resetModules();
    vi.doMock("../../src/middleware/rateLimiter", () => ({
      generalRateLimiter: (_req: any, _res: any, next: any) => next(),
      generateRateLimiter: (_req: any, _res: any, next: any) => next(),
      checkDailyCeiling: (_req: any, _res: any, next: any) => next(),
      checkTokenBalance: (_req: any, _res: any, next: any) => next(),
      acquireLock: (_userId: string) => false,
      releaseLock: (_userId: string) => {},
    }));

    const { default: app } = await import("../../server");
    const token = generateToken("test-user");

    const res = await request(app)
      .post("/api/generate")
      .set("Authorization", `Bearer ${token}`)
      .send({ interests: ["science"] });

    expect(res.status).toBe(429);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /api/generate - daily ceiling hit returns 403", async () => {
    vi.resetModules();
    vi.doMock("../../src/middleware/rateLimiter", () => ({
      generalRateLimiter: (_req: any, _res: any, next: any) => next(),
      generateRateLimiter: (_req: any, _res: any, next: any) => next(),
      checkDailyCeiling: (_req: any, _res: any, next: any) =>
        next(new AppError(403, "Daily ceiling reached")),
      checkTokenBalance: (_req: any, _res: any, next: any) => next(),
      acquireLock: (_userId: string) => true,
      releaseLock: (_userId: string) => {},
    }));

    const { default: app } = await import("../../server");
    const token = generateToken("test-user");

    const res = await request(app)
      .post("/api/generate")
      .set("Authorization", `Bearer ${token}`)
      .send({ interests: ["science"] });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /api/generate - unauthenticated returns 401", async () => {
    vi.resetModules();
    const { default: app } = await import("../../server");

    const res = await request(app)
      .post("/api/generate")
      .send({ interests: ["science"] });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /api/generate - rate limited returns 429", async () => {
    vi.resetModules();
    vi.doMock("../../src/middleware/rateLimiter", () => ({
      generalRateLimiter: (_req: any, _res: any, next: any) => next(),
      generateRateLimiter: (_req: any, _res: any, next: any) =>
        next(new AppError(429, "Generation rate limit exceeded")),
      checkDailyCeiling: (_req: any, _res: any, next: any) => next(),
      checkTokenBalance: (_req: any, _res: any, next: any) => next(),
      acquireLock: (_userId: string) => true,
      releaseLock: (_userId: string) => {},
    }));

    const { default: app } = await import("../../server");
    const token = generateToken("test-user");

    const res = await request(app)
      .post("/api/generate")
      .set("Authorization", `Bearer ${token}`)
      .send({ interests: ["science"] });

    expect(res.status).toBe(429);
    expect(res.body).toHaveProperty("error");
  });

  // --- PUT /api/settings tests ---
  it("PUT /api/settings - valid settings saved", async () => {
    vi.resetModules();
    const saveSpy: any = vi.fn(async () => {});
    vi.doMock("../../src/lib/db", () => ({
      getUserSettings: vi.fn(async () => ({})),
      saveUserSettings: saveSpy,
    }));

    const { default: app } = await import("../../server");
    const token = generateToken("test-user");

    const payload = {
      model: "gemini-3.1-flash-lite",
    };

    const res = await request(app)
      .put("/api/settings")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(200);
    expect(saveSpy).toHaveBeenCalled();
  });

  it("PUT /api/settings - invalid model returns 400", async () => {
    vi.resetModules();
    const gemini = await import("../../src/lib/gemini");
    const { default: app } = await import("../../server");
    const token = generateToken("test-user");

    const payload = {
      model: "invalid-model",
    };

    const res = await request(app)
      .put("/api/settings")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
    expect(gemini.ai.models.generateContent as any).not.toHaveBeenCalled();
  });

  it("PUT /api/settings - forged userId header is ignored in favor of token identity", async () => {
    vi.resetModules();
    const saveSpy: any = vi.fn(async () => {});
    const { verifyToken } = await import("../../src/lib/auth");

    vi.doMock("../../src/middleware/auth", () => ({
      authenticate: (req: any, _res: any, next: any) => {
        const authHeader = req.headers?.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
          return next(
            new AppError(401, "Unauthorized: Missing or invalid token"),
          );
        }

        const token = authHeader.split(" ")[1];
        const userId = verifyToken(token);
        if (!userId) {
          return next(
            new AppError(401, "Unauthorized: Token expired or invalid"),
          );
        }

        req.userId = userId;
        return next();
      },
      asyncHandler: (fn: any) => fn,
    }));

    vi.doMock("../../src/lib/db", () => ({
      getUserSettings: vi.fn(async () => ({})),
      saveUserSettings: saveSpy,
    }));

    const { generateToken } = await import("../../src/lib/auth");
    const { default: app } = await import("../../server");
    const token = generateToken("real-user");

    const res = await request(app)
      .put("/api/settings")
      .set("Authorization", `Bearer ${token}`)
      .set("x-user-id", "forged-user")
      .send({
        model: "gemini-3.1-flash-lite",
      });

    expect(res.status).toBe(200);
    const firstCall =
      ((saveSpy as any).mock.calls?.[0] as any[] | undefined) ?? [];
    expect(firstCall?.[0]).toBe("real-user");
    expect(firstCall?.[0]).not.toBe("forged-user");
  });

  it("POST /api/generate - releases the lock after a database sync failure", async () => {
    vi.resetModules();
    const activeLocks = new Set<string>();
    vi.doMock("../../src/lib/memory", () => ({
      getUserInterests: vi.fn(async () => []),
    }));
    vi.doMock("../../src/middleware/rateLimiter", () => ({
      generalRateLimiter: (_req: any, _res: any, next: any) => next(),
      generateRateLimiter: (_req: any, _res: any, next: any) => next(),
      checkDailyCeiling: (_req: any, _res: any, next: any) => next(),
      checkTokenBalance: (_req: any, _res: any, next: any) => next(),
      acquireLock: (userId: string) => {
        if (activeLocks.has(userId)) {
          return false;
        }
        activeLocks.add(userId);
        return true;
      },
      releaseLock: (userId: string) => {
        activeLocks.delete(userId);
      },
    }));
    let callCount = 0;
    vi.doMock("../../src/agents/supervisor", () => ({
      runSupervisorStream: async () => {
        callCount += 1;
        if (callCount === 1) {
          throw new Error("Supabase insert failed during database sync");
        }

        return {
          currentTopic: {
            title: "Generated Topic",
            domain: "science",
            summary: "A short summary",
          },
          topicEmbedding: [0.1, 0.2],
          research: [],
          wikiResearch: [],
          article:
            "This is a sufficiently long generated article used for testing the API response body.",
          nodeMetrics: [],
          articleId: "article-2",
        };
      },
    }));

    const { default: app } = await import("../../server");
    const token = generateToken("lock-user");

    const first = await request(app)
      .post("/api/generate")
      .set("Authorization", `Bearer ${token}`)
      .send({ interests: ["science"] });

    expect(first.status).toBe(200);
    expect(first.text).toContain('"status":"failed"');
    expect(first.text).toContain("Supabase insert failed during database sync");

    const second = await request(app)
      .post("/api/generate")
      .set("Authorization", `Bearer ${token}`)
      .send({ interests: ["science"] });

    expect(second.status).not.toBe(429);
    expect(second.text).not.toContain(
      "An article is already generating for this user.",
    );
  });

  // --- POST /api/interests tests ---
  it("POST /api/interests - valid interest adds and returns success", async () => {
    vi.resetModules();
    const addSpy = vi.fn(async () => {});
    vi.doMock("../../src/lib/memory", () => ({
      getUserInterests: vi.fn(async () => []),
      addInterest: addSpy,
      deleteInterest: vi.fn(async () => {}),
    }));

    const { default: app } = await import("../../server");
    const token = generateToken("test-user");

    const res = await request(app)
      .post("/api/interests")
      .set("Authorization", `Bearer ${token}`)
      .send({ interest: "gardening" });

    expect(res.status).toBe(200);
    expect(addSpy).toHaveBeenCalled();
  });

  it("POST /api/interests - empty input returns 400", async () => {
    vi.resetModules();
    const { default: app } = await import("../../server");
    const token = generateToken("test-user");

    const res = await request(app)
      .post("/api/interests")
      .set("Authorization", `Bearer ${token}`)
      .send({ interest: "" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});
