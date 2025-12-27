import { describe, it, expect } from "vitest";
import pipe from "./async-pipe";

describe("async-pipe tests", () => {
  it("should pipe value be value", async () => {
    const { value } = pipe(Promise.resolve(1));
    await expect(value).resolves.toBe(1);
  });

  it("should pipe number through a sequence of functions", async () => {
    const fn1 = (x: number) => Promise.resolve(x + 1);
    const fn2 = (x: number) => Promise.resolve(x * 2);

    const { value } = pipe(Promise.resolve(1)).pipe(fn1).pipe(fn2);

    await expect(value).resolves.toBe(4);
  });
});
