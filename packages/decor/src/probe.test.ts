import { describe, it, expect, vi } from "vitest";
import { probe } from "./probe";
import type { Result } from "./types";

function createSubject() {
  const spies = { args: vi.fn(), ret: vi.fn() };
  const decor = probe((args) => {
    spies.args(args);
    return (result) => {
      spies.ret(result);
    };
  });
  return { decor, ...spies };
}

const someValue = { value: expect.anything() as unknown };
const someError = { error: expect.anything() as unknown };

describe("probe decorator tests", () => {
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
    expect(ret).toHaveBeenCalledWith({ value: 2 });
    expect(ret).not.toHaveBeenCalledWith(someError);
  });

  it("should probe function arguments and failure", () => {
    const { decor, args, ret } = createSubject();

    const div = decor(divide);

    expect(() => div(4, 0)).toThrow(divideByZeroError);
    expect(args).toHaveBeenCalledWith([4, 0]);
    expect(ret).not.toHaveBeenCalledWith(someValue);
    expect(ret).toHaveBeenCalledWith({ error: divideByZeroError });
  });

  it("should probe without return", () => {
    const spy = vi.fn();
    const decor = probe((args) => {
      spy(args);
    });
    const div = decor(divide);

    expect(div(4, 2)).toBe(2);
    expect(spy).toHaveBeenCalledWith([4, 2]);
  });

  it("should probe modify arguments", () => {
    const decor = probe((args: [a: number, b: number]) => {
      args[0] = -args[0];
      args[1] = -args[1];
      args.push(42);
    });

    const spy = vi.fn((a: number, b: number) => a + b);
    const add = decor(spy);

    expect(add(1, 2)).toBe(-3);
    expect(spy).toHaveBeenCalledWith(-1, -2, 42);
  });

  it("should probe typed", () => {
    interface A {
      foo: string;
    }
    interface B extends A {
      bar: string;
    }

    const spyArgs = vi.fn<(a: A) => void>();
    const spyResult = vi.fn<(result: Result<A>) => void>();
    const decor = probe(([a]: [a: A]) => {
      spyArgs(a);
      return spyResult;
    });

    const fn1: (b: B) => B = (b: B) => b;

    const fn2: (b: B) => B = decor(fn1);

    const b = { foo: "foo1", bar: "bar1" };
    const res = fn2(b);
    expect(res).toBe(b);

    expect(spyArgs).toHaveBeenCalledWith(b);
    expect(spyResult).toHaveBeenCalledWith({ value: b });
    expect(spyResult).not.toHaveBeenCalledWith(someError);
  });
});
