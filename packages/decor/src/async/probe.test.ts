import { describe, it, expect, vi } from "vitest";
import { probe } from "./probe";
import { Attempt } from "../types";

function createSubject() {
  const spies = { args: vi.fn(), ret: vi.fn() };
  const decor = probe(async (...args) => {
    spies.args(args);
    await Promise.resolve();
    return async ([error, value]) => {
      await Promise.resolve();
      spies.ret([error, value]);
    };
  });
  return { decor, ...spies };
}

describe("probe tests", () => {
  it("should probe function arguments and success", async () => {
    const { decor, args, ret } = createSubject();
    const fn = decor((x: number) => Promise.resolve(x + 1));

    await expect(fn(2)).resolves.toBe(3);
    expect(args).toHaveBeenCalledWith([2]);
    expect(ret).toHaveBeenCalledWith([undefined, 3]);
  });

  it("should probe function arguments and failure", async () => {
    const { decor, args, ret } = createSubject();
    const error = new Error("problem");
    const fn = decor((_x: number) => Promise.reject<number>(error));

    await expect(fn(2)).rejects.toThrow(error);
    expect(args).toHaveBeenCalledWith([2]);
    expect(ret).toHaveBeenCalledWith([error, undefined]);
  });

  it("should probe without return", async () => {
    const spy = vi.fn();
    const decor = probe(async (...args) => {
      spy(await Promise.resolve(args));
    });
    const fn = decor((x: number) => Promise.resolve(x + 1));

    await expect(fn(2)).resolves.toBe(3);
    expect(spy).toHaveBeenCalledWith([2]);
  });

  it("should probe typed", async () => {
    interface A {
      foo: string;
    }
    interface B extends A {
      bar: string;
    }

    const spyArgs = vi.fn<(a: A) => void>();
    const spyValue = vi.fn<(value?: A) => void>();
    const spyError = vi.fn<(error?: unknown) => void>();
    const decor = probe(async (a: A) => {
      spyArgs(a);
      await Promise.resolve();
      return async ([error, value]: Attempt<A>) => {
        spyError(error);
        spyValue(value);
        await Promise.resolve();
      };
    });

    const fn1: (b: B) => Promise<B> = (b: B) => Promise.resolve(b);

    const fn2: (b: B) => Promise<B> = decor(fn1);

    const b = { foo: "foo1", bar: "bar1" };
    await expect(fn2(b)).resolves.toBe(b);

    expect(spyArgs).toHaveBeenCalledWith(b);
    expect(spyError).toHaveBeenCalledWith(undefined);
    expect(spyValue).toHaveBeenCalledWith(b);
  });
});
