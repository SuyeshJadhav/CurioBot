/**
 * Unit tests for the 24-hour token auto-refresh logic in getUserTokenBalance.
 *
 * Each test manually calls vi.resetModules() then vi.doMock() before importing
 * db, ensuring our per-test supabase stub is what db.ts actually uses.
 */
import { describe, it, expect, vi } from "vitest";

const TWENTY_FIVE_HOURS_MS = 25 * 60 * 60 * 1000;
const TWENTY_THREE_HOURS_MS = 23 * 60 * 60 * 1000;
const TOKEN_REFRESH_AMOUNT = 100_000;

/** Build a minimal fluent supabase-client stub for the `users` table. */
function makeSupabaseMock(
  selectData: { token_balance: number; last_token_refresh: string | null },
  updateError: { message: string } | null = null
) {
  const updateEqFn = vi.fn().mockResolvedValue({ error: updateError });
  const updateFn = vi.fn().mockReturnValue({ eq: updateEqFn });

  const singleFn = vi.fn().mockResolvedValue({ data: selectData, error: null });
  const selectEqFn = vi.fn().mockReturnValue({ single: singleFn });
  const selectFn = vi.fn().mockReturnValue({ eq: selectEqFn });

  const fromFn = vi.fn().mockReturnValue({ select: selectFn, update: updateFn });
  const client = { from: fromFn };

  return { client, fromFn, selectFn, updateFn, updateEqFn };
}

describe("getUserTokenBalance — 24-hour auto-refresh", () => {
  it("resets balance to 100,000 when last_token_refresh is older than 24 hours", async () => {
    const oldRefresh = new Date(Date.now() - TWENTY_FIVE_HOURS_MS).toISOString();
    const { client, updateFn, updateEqFn } = makeSupabaseMock({
      token_balance: 0,
      last_token_refresh: oldRefresh,
    });

    vi.resetModules();
    vi.doMock("../../src/lib/supabase", () => ({ default: client }));

    const { getUserTokenBalance } = await import("../../src/lib/db");
    const balance = await getUserTokenBalance("user-stale");

    expect(balance).toBe(TOKEN_REFRESH_AMOUNT);
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ token_balance: TOKEN_REFRESH_AMOUNT })
    );
    expect(updateEqFn).toHaveBeenCalledWith("id", "user-stale");
  });

  it("preserves existing balance when last_token_refresh is within 24 hours", async () => {
    const recentRefresh = new Date(Date.now() - TWENTY_THREE_HOURS_MS).toISOString();
    const { client, updateFn } = makeSupabaseMock({
      token_balance: 42_000,
      last_token_refresh: recentRefresh,
    });

    vi.resetModules();
    vi.doMock("../../src/lib/supabase", () => ({ default: client }));

    const { getUserTokenBalance } = await import("../../src/lib/db");
    const balance = await getUserTokenBalance("user-fresh");

    expect(balance).toBe(42_000);
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("resets balance when last_token_refresh is null (new user row)", async () => {
    const { client, updateFn } = makeSupabaseMock({
      token_balance: TOKEN_REFRESH_AMOUNT,
      last_token_refresh: null,
    });

    vi.resetModules();
    vi.doMock("../../src/lib/supabase", () => ({ default: client }));

    const { getUserTokenBalance } = await import("../../src/lib/db");
    const balance = await getUserTokenBalance("user-new");

    expect(balance).toBe(TOKEN_REFRESH_AMOUNT);
    expect(updateFn).toHaveBeenCalled();
  });

  it("falls back to existing balance when the refresh DB update fails", async () => {
    const oldRefresh = new Date(Date.now() - TWENTY_FIVE_HOURS_MS).toISOString();
    const { client } = makeSupabaseMock(
      { token_balance: 500, last_token_refresh: oldRefresh },
      { message: "DB write failed" }
    );

    vi.resetModules();
    vi.doMock("../../src/lib/supabase", () => ({ default: client }));

    const { getUserTokenBalance } = await import("../../src/lib/db");
    const balance = await getUserTokenBalance("user-db-fail");

    // Graceful fallback — do not throw, return the pre-refresh balance
    expect(balance).toBe(500);
  });
});
