import { describe, it, expect, vi } from "vitest";
import { probe } from "./probe";
import { Attempt } from "./types";

function createSubject() {
  const spies = { args: vi.fn(), ret: vi.fn() };
  const decor = probe((...args) => {
    spies.args(args);
    return ([error, value]) => {
      spies.ret([error, value]);
    };
  });
  return { decor, ...spies };
}

describe("probe tests", () => {
  const divideByZeroError = new Error("cannot divide by zero");
  function divide(a: number, b: number) {
    if (b === 0) {
      throw divideByZeroError;
    }
    return a / b;
  }
  it("should probe function arguments and success", () => {
    const { decor, args, ret } = createSubject();

    const div = decor(divide);

    expect(div(4, 2)).toBe(2);
    expect(args).toHaveBeenCalledWith([4, 2]);
    expect(ret).toHaveBeenCalledWith([undefined, 2]);
  });

  it("should probe function arguments and failure", () => {
    const { decor, args, ret } = createSubject();

    const div = decor(divide);

    expect(() => div(4, 0)).toThrow(divideByZeroError);
    expect(args).toHaveBeenCalledWith([4, 0]);
    expect(ret).toHaveBeenCalledWith([divideByZeroError, undefined]);
  });

  it("should probe without return", () => {
    const spy = vi.fn();
    const decor = probe((...args) => {
      spy(args);
    });
    const div = decor(divide);

    expect(div(4, 2)).toBe(2);
    expect(spy).toHaveBeenCalledWith([4, 2]);
  });

  it("should probe typed", () => {
    interface A {
      foo: string;
    }
    interface B extends A {
      bar: string;
    }

    const spyArgs = vi.fn<(a: A) => void>();
    const spyValue = vi.fn<(value?: A) => void>();
    const spyError = vi.fn<(error?: unknown) => void>();
    const decor = probe((a: A) => {
      spyArgs(a);
      return ([error, value]: Attempt<A>) => {
        spyError(error);
        spyValue(value);
      };
    });

    const fn1: (b: B) => B = (b: B) => b;

    const fn2: (b: B) => B = decor(fn1);

    const b = { foo: "foo1", bar: "bar1" };
    const res = fn2(b);
    expect(res).toBe(b);

    expect(spyArgs).toHaveBeenCalledWith(b);
    expect(spyError).toHaveBeenCalledWith(undefined);
    expect(spyValue).toHaveBeenCalledWith(b);
  });
});
