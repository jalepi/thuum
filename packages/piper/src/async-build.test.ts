import { describe, it, expect } from "vitest";
import asyncBuild from "./async-build";

describe("async-builder tests", () => {
  it("should build returns builder", () => {
    const { fn, pipe } = asyncBuild<unknown>();

    expect(fn).toBeTypeOf("function");
    expect(pipe).toBeTypeOf("function");
  });

  it("should build returns identity", async () => {
    const { fn } = asyncBuild<number>();
    await expect(fn(1)).resolves.toBe(1);
  });

  it("should build chains sequence of functions into result", async () => {
    const fn1 = (x: number) => Promise.resolve(x + 1);
    const fn2 = (x: number) => Promise.resolve(x * 2);

    const { fn } = asyncBuild<number>().pipe(fn1).pipe(fn2);

    await expect(fn(1)).resolves.toBe(4);
  });

  it("should pipe mixed synchronous and asynchronous functions", async () => {
    const add = (y: number) => (x: number) => x + y;
    const mult = (y: number) => (x: number) => x * y;
    const addAsync = (y: number) => (x: number) => Promise.resolve(x + y);
    const multAsync = (y: number) => (x: number) => Promise.resolve(x * y);

    const { fn } = asyncBuild<number>()
      .pipe(add(1))
      .pipe(mult(2))
      .pipe(addAsync(1))
      .pipe(multAsync(2))
      .pipe(add(1))
      .pipe(mult(2))
      .pipe(addAsync(1))
      .pipe(multAsync(2));

    await expect(fn(1)).resolves.toBe(46);
  });
});
