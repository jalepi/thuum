import { describe, it, expect } from "vitest";
import * as index from ".";

describe("decor package exports tests", () => {
  it("should export nothing", async () => {
    expect(index).toBeDefined();
    expect(index).toMatchObject({
      ...(await import("./attempt")),
      ...(await import("./probe")),
    });
  });
});
