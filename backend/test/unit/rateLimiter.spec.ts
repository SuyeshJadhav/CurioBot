import { describe, it, expect, vi } from "vitest";

describe("rateLimiter concurrency locks", () => {
  it("acquireLock prevents double acquisition and releaseLock clears lock", async () => {
    // Import afresh so module state is new per test
    const rl = await import("../../src/middleware/rateLimiter");
    const userId = "user-42";

    const first = rl.acquireLock(userId);
    expect(first).toBe(true);

    const second = rl.acquireLock(userId);
    expect(second).toBe(false);

    // Release and ensure can acquire again
    rl.releaseLock(userId);
    const third = rl.acquireLock(userId);
    expect(third).toBe(true);

    rl.releaseLock(userId);
  });

  it("lock TTL expires and auto-releases", async () => {
    const rl = await import("../../src/middleware/rateLimiter");
    vi.useFakeTimers();
    try {
      const userId = "user-ttl";
      const ok = rl.acquireLock(userId);
      expect(ok).toBe(true);

      // Advance time beyond LOCK_TTL_MS (180s)
      vi.advanceTimersByTime(181 * 1000);

      // wait a tick for timer handler
      await Promise.resolve();

      expect(rl.activeGenerations.has(userId)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
