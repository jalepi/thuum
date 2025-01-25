import { describe, it, expect, vi } from "vitest";
import { probe } from "./probe";

function createSubject() {
  const spies = { args: vi.fn(), ret: vi.fn() };
  const decor = probe(({ args }) => {
    spies.args(args);
    return (ret) => {
      spies.ret(ret);
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
    expect(ret).toHaveBeenCalledWith({ value: 2, success: true });
  });

  it("should probe function arguments and failure", () => {
    const { decor, args, ret } = createSubject();

    const div = decor(divide);

    expect(() => div(4, 0)).toThrow(divideByZeroError);
    expect(args).toHaveBeenCalledWith([4, 0]);
    expect(ret).toHaveBeenCalledWith({ error: divideByZeroError, success: false });
  });
});
