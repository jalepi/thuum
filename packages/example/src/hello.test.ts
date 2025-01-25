import { describe, it, expect } from "vitest";
import { hello } from "./hello";

describe("hello tests", () => {
  it("should say hello", () => {
    expect(hello()).toBe("hello");
  });
});
