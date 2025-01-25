import { describe, it, expect, vi } from "vitest";
import { build } from "./build";

describe("builder tests", () => {
  it("should build returns builder", () => {
    const { fn, pipe } = build<unknown>();

    expect(fn).toBeTypeOf("function");
    expect(pipe).toBeTypeOf("function");
  });

  it("should build returns identity", () => {
    const { fn } = build<number>();
    expect(fn(1)).toBe(1);
  });

  it("should build chains sequence of functions into result", () => {
    const fn1 = vi.fn((x: number) => x + 1);
    const fn2 = vi.fn((x: number) => x * 2);

    const { fn } = build<number>().pipe(fn1).pipe(fn2);

    expect(fn(1)).toBe(4);
    expect(fn1).toHaveBeenCalledWith(1);
    expect(fn1).toHaveReturnedWith(2);
    expect(fn2).toHaveBeenCalledWith(2);
    expect(fn2).toHaveReturnedWith(4);
  });
});
