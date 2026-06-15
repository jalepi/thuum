import { describe, it, expect } from "bun:test";
import * as index from ".";

describe("decor async package exports tests", () => {
  it("should export all async decorators", async () => {
    expect(index).toBeDefined();
    expect(index).toMatchObject({
      ...(await import("./attempt")),
      ...(await import("./decorate")),
      ...(await import("./probe")),
    });
  });
});
