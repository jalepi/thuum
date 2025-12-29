import { describe, it, expect, vi } from "vitest";
import asyncPipe from "./async-pipe";

describe("async-pipe tests", () => {
  it("should pipe value be value", async () => {
    const { value } = asyncPipe(Promise.resolve(1));
    await expect(value).resolves.toBe(1);
  });

  it("should pipe number through a sequence of functions", async () => {
    const fn1 = (x: number) => Promise.resolve(x + 1);
    const fn2 = (x: number) => Promise.resolve(x * 2);

    const { value } = asyncPipe(Promise.resolve(1)).pipe(fn1).pipe(fn2);

    await expect(value).resolves.toBe(4);
  });

  it("should pipe mixed synchronous and asynchronous functions", async () => {
    const add = (y: number) => (x: number) => x + y;
    const mult = (y: number) => (x: number) => x * y;
    const addAsync = (y: number) => (x: number) => Promise.resolve(x + y);
    const multAsync = (y: number) => (x: number) => Promise.resolve(x * y);

    const { value } = asyncPipe(1)
      .pipe(add(1))
      .pipe(mult(2))
      .pipe(addAsync(1))
      .pipe(multAsync(2))
      .pipe(add(1))
      .pipe(mult(2))
      .pipe(addAsync(1))
      .pipe(multAsync(2));

    await expect(value).resolves.toBe(46);
  });

  it("should pipe throws stop execution", async () => {
    const spy = vi.fn<(x: number) => number>((x) => x);
    const { value } = asyncPipe(1)
      .pipe(() => Promise.reject(new Error("One")))
      .pipe(spy);

    await expect(value).rejects.toThrowError(new Error("One"));
    expect(spy).not.toHaveBeenCalled();
  });
});
