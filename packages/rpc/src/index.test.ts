import { describe, it, expect } from "bun:test";
import * as Index from ".";

describe("package exports tests", () => {
  it("should export the module", () => {
    expect(Index).toBeObject();
  });
});
