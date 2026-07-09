import { describe, expect, it } from "bun:test";
import * as index from ".";

describe("example package exports tests", () => {
  it("should export hello", async () => {
    expect(index).toBeDefined();
    expect(index).toMatchObject({
      ...(await import(".")),
    } as const satisfies typeof index);
  });
});
