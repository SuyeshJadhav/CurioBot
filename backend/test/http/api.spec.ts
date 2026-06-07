import { describe, it, expect, vi } from "vitest";
import request from "supertest";

// Mock auth middleware before importing the app so routes use the mocked middleware
vi.mock("../../src/middleware/auth", () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.userId = "test-user";
    return next();
  },
  asyncHandler: (fn: any) => fn,
}));

// Mock DB to return predictable settings
vi.mock("../../src/lib/db", () => ({
  getUserSettings: vi
    .fn()
    .mockResolvedValue({
      model: "gemini-3.1-flash-lite",
    }),
  saveUserSettings: vi.fn().mockResolvedValue({ success: true }),
}));

import app from "../../server";

describe("HTTP API", () => {
  it("responds to health check", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
  });

  it("returns user settings for authenticated user", async () => {
    const res = await request(app)
      .get("/api/settings")
      .set("Authorization", "Bearer faketoken");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/json/);
  });
});
