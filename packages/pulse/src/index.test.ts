import { describe, it, expect } from "bun:test";
import * as index from ".";

describe("example package exports tests", () => {
  it("should export {}", () => {
    expect(index).toBeDefined();
    expect(index).toMatchObject({} as const satisfies typeof index);
  });
});
