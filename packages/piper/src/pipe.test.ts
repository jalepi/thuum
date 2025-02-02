import { describe, it, expect, vi } from "vitest";
import pipe from "./pipe";

describe("pipe tests", () => {
  it("should pipe value be value", () => {
    const { value } = pipe(1);
    expect(value).toBe(1);
  });

  it("should pipe number through a sequence of functions", () => {
    const fn1 = vi.fn((x: number) => x + 1);
    const fn2 = vi.fn((x: number) => x * 2);

    const { value } = pipe(1).pipe(fn1).pipe(fn2);

    expect(value).toBe(4);
    expect(fn1).toHaveBeenCalledWith(1);
    expect(fn1).toHaveReturnedWith(2);
    expect(fn2).toHaveBeenCalledWith(2);
    expect(fn2).toHaveReturnedWith(4);
  });
});
