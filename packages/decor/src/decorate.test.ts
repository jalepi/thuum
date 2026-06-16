import { describe, expect, it, vi } from "bun:test";
import { decorate } from "./decorate";

describe("decorate tests", () => {
  it("should not throw", () => {
    const spy = vi.fn();

    const decorated = decorate(spy, (fn, ...args: unknown[]) => {
      fn(...args);
    });

    expect(decorated).not.toThrow();
  });

  it("should receive args", () => {
    const spy = vi.fn();
    function test(_a: number, _b: string, _c: boolean) {
      //
    }

    const decorated = decorate(test, (fn, ...args) => {
      spy(...args);
      fn(...args);
    });
    decorated(1, "foo", true);

    expect(spy).toHaveBeenCalledWith(1, "foo", true);
  });

  it("should return value", () => {
    function test() {
      return 1;
    }

    const decorated = decorate(test, (fn, ...args) => {
      return fn(...args);
    });

    expect(decorated()).toBe(1);
  });

  it("should bind this", () => {
    const spy = vi.fn();
    function test(this: unknown) {
      spy(this);
    }

    const obj = {
      test: decorate(test, (fn, ...args) => {
        fn(...args);
      }),
    };

    obj.test();
    expect(spy).toHaveBeenCalledWith(obj);
  });

  it("should substitute args", () => {
    const spy = vi.fn();
    function test(a: number, b: string, c: boolean) {
      spy(a, b, c);
    }

    const decorated = decorate(test, (fn, a, b, c) => {
      fn(a + 1, b + "1", !c);
    });
    decorated(1, "foo", true);

    expect(spy).toHaveBeenCalledWith(1 + 1, "foo" + "1", !true);
  });

  it("should substitute return", () => {
    const spy = vi.fn();
    function test() {
      spy();
      return 1;
    }

    const decorated = decorate(test, (fn, ...args) => fn(...args) + 1);

    expect(decorated()).toBe(1 + 1);
    expect(spy).toHaveBeenCalled();
  });

  it("should short circuit", () => {
    const spy = vi.fn();
    function test() {
      spy();
      return 1;
    }

    const decorated = decorate(test, (_fn, ..._args) => {
      return undefined as unknown as number;
    });

    expect(decorated()).toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
  });

  it("should retry on failure", () => {
    let calls = 0;
    function unreliable() {
      calls++;
      if (calls === 1) throw new Error("fail");
      return "ok";
    }

    const decorated = decorate(unreliable, (fn, ...args) => {
      try {
        return fn(...args);
      } catch {
        return fn(...args);
      }
    });

    expect(decorated()).toBe("ok");
    expect(calls).toBe(2);
  });

  it("should memoize", () => {
    const spy = vi.fn();
    function compute(n: number) {
      spy(n);
      return n * n;
    }

    const decorated = decorate(
      compute,
      (() => {
        const cache = new Map<number, number>();
        return (fn: (n: number) => number, n: number) => {
          const cached = cache.get(n);
          if (cached !== undefined) {
            return cached;
          }
          const result = fn(n);
          cache.set(n, result);
          return result;
        };
      })(),
    );

    expect(decorated(5)).toBe(25);
    expect(decorated(5)).toBe(25);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("should validate args", () => {
    function divide(a: number, b: number) {
      return a / b;
    }

    const decorated = decorate(divide, (fn, a, b) => {
      if (b === 0) throw new Error("division by zero");
      return fn(a, b);
    });

    expect(() => decorated(10, 0)).toThrow("division by zero");
    expect(decorated(10, 2)).toBe(5);
  });
});
