import { describe, it, expect, vi } from "bun:test";
import asyncBuild from "./async-build";

describe("async-builder tests", () => {
  it("should build returns builder", () => {
    const { fn, pipe } = asyncBuild<unknown>();

    expect(fn).toBeTypeOf("function");
    expect(pipe).toBeTypeOf("function");
  });

  it("should build returns identity", () => {
    const { fn } = asyncBuild<number>();
    expect(fn(1)).resolves.toBe(1);
  });

  it("should build chains sequence of functions into result", () => {
    const fn1 = (x: number) => Promise.resolve(x + 1);
    const fn2 = (x: number) => Promise.resolve(x * 2);

    const { fn } = asyncBuild<number>().pipe(fn1).pipe(fn2);

    expect(fn(1)).resolves.toBe(4);
  });

  it("should pipe mixed synchronous and asynchronous functions", () => {
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

    expect(fn(1)).resolves.toBe(46);
  });

  it("should pipe throws stop execution", () => {
    const spy = vi.fn<(x: number) => number>((x) => x);
    const { fn } = asyncBuild<number>()
      .pipe(() => Promise.reject(new Error("One")))
      .pipe(spy);

    expect(fn(1)).rejects.toThrowError(new Error("One"));
    expect(spy).not.toHaveBeenCalled();
  });
});
