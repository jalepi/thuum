import { describe, it, expect } from "vitest";
import * as index from ".";

describe("example package exports tests", () => {
  it("should export hello", () => {
    expect(index).toBeDefined();
    expect(index).toMatchObject({});
  });
});
