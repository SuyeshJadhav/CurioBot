import { describe, it, expect, vi } from "vitest";
import { AppError } from "../../src/lib/errors";

const mockGetBalance = vi.fn();
vi.mock("../../src/lib/db", () => ({
  getUserTokenBalance: (userId: string) => mockGetBalance(userId),
}));

describe("checkTokenBalance middleware", () => {
  it("allows requests when user has positive balance", async () => {
    mockGetBalance.mockResolvedValueOnce(5000);
    const { checkTokenBalance } = await import("../../src/middleware/rateLimiter");

    const req = { userId: "user-ok" } as any;
    const res = {} as any;
    const next = vi.fn();

    await checkTokenBalance(req, res, next);

    expect(mockGetBalance).toHaveBeenCalledWith("user-ok");
    expect(next).toHaveBeenCalledWith();
    expect(next).not.toHaveBeenCalledWith(expect.any(AppError));
  });

  it("denies requests with 403 when user has 0 balance", async () => {
    mockGetBalance.mockResolvedValueOnce(0);
    const { checkTokenBalance } = await import("../../src/middleware/rateLimiter");

    const req = { userId: "user-broke" } as any;
    const res = {} as any;
    const next = vi.fn();

    await checkTokenBalance(req, res, next);

    expect(mockGetBalance).toHaveBeenCalledWith("user-broke");
    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
    expect(err.message).toContain("exhausted your token balance");
  });

  it("allows system user regardless of balance", async () => {
    const { checkTokenBalance } = await import("../../src/middleware/rateLimiter");

    const req = { userId: "00000000-0000-0000-0000-000000000000" } as any;
    const res = {} as any;
    const next = vi.fn();

    await checkTokenBalance(req, res, next);

    expect(mockGetBalance).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });
});
