import { describe, it, expect } from "vitest";
import { build } from "./async-build";

describe("async-builder tests", () => {
  it("should build returns builder", () => {
    const { fn, pipe } = build<unknown>();

    expect(fn).toBeTypeOf("function");
    expect(pipe).toBeTypeOf("function");
  });

  it("should build returns identity", async () => {
    const { fn } = build<number>();
    await expect(fn(1)).resolves.toBe(1);
  });

  it("should build chains sequence of functions into result", async () => {
    const fn1 = (x: number) => Promise.resolve(x + 1);
    const fn2 = (x: number) => Promise.resolve(x * 2);

    const { fn } = build<number>().pipe(fn1).pipe(fn2);

    await expect(fn(1)).resolves.toBe(4);
  });
});
