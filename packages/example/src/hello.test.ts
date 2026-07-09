import { describe, expect, it } from "bun:test";
import { hello } from "./hello";

describe("hello tests", () => {
  it("should say hello", () => {
    expect(hello()).toBe("hello");
  });
});
