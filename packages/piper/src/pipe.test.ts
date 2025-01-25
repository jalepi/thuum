import { describe, it, expect } from "vitest";
import { pipe } from "./pipe";

describe("pipe tests", () => {
  it("should pipe number throught sequence of functions", () => {
    const { value } = pipe(1)
      .pipe((x) => x + 1)
      .pipe((x) => x * 2);

    expect(value).toBe(4);
  });
});
