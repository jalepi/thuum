import { describe, it, expect } from "vitest";

describe("decor package exports tests", () => {
  it("should export nothing", async () => {
    const index = await import(".");
    expect(index).toBeDefined();
    expect(index).toMatchObject({});
  });
});
