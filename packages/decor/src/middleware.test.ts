import { describe, expect, it, vi } from "bun:test";
import { middleware } from "./middleware";

describe("middleware tests", () => {
  it("should pass through when next is called", () => {
    const spy = vi.fn();

    const bypass = middleware((next) => {
      next();
    });
    const decorated = bypass(spy);

    decorated();
    expect(spy).toHaveBeenCalled();
  });

  it("should forward arguments to the original function", () => {
    const spy = vi.fn();
    function test(a: number, b: string, c: boolean) {
      spy(a, b, c);
    }

    const bypass = middleware((next) => {
      next();
    });
    const decorated = bypass(test);
    decorated(1, "foo", true);

    expect(spy).toHaveBeenCalledWith(1, "foo", true);
  });

  it("should preserve the return value", () => {
    function test() {
      return 42;
    }

    const bypass = middleware((next) => {
      next();
    });
    const decorated = bypass(test);

    expect(decorated()).toBe(42);
  });

  it("should bind this context", () => {
    const spy = vi.fn();
    function test(this: unknown) {
      spy(this);
    }

    const bypass = middleware((next) => {
      next();
    });
    const obj = { test: bypass(test) };

    obj.test();
    expect(spy).toHaveBeenCalledWith(obj);
  });

  it("should short-circuit when next is not called", () => {
    const spy = vi.fn();
    function test() {
      spy();
      return 1;
    }

    const shortCircuit = middleware((_next) => {
      // noop - do not call next
    });
    const decorated = shortCircuit(test);

    expect(decorated()).toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
  });

  it("should execute code before and after the function", () => {
    const order: string[] = [];

    function test() {
      order.push("fn");
    }

    const wrap = middleware((next) => {
      order.push("before");
      next();
      order.push("after");
    });
    const decorated = wrap(test);

    decorated();
    expect(order).toEqual(["before", "fn", "after"]);
  });

  it("should allow middleware to throw and prevent execution", () => {
    const spy = vi.fn();
    const error = new Error("access denied");

    function test() {
      spy();
      return 1;
    }

    const guard = middleware((_next) => {
      throw error;
    });
    const decorated = guard(test);

    expect(() => decorated()).toThrow(error);
    expect(spy).not.toHaveBeenCalled();
  });

  it("should allow middleware to throw after execution", () => {
    const spy = vi.fn();
    const error = new Error("post-execution failure");

    function test() {
      spy();
    }

    const wrap = middleware((next) => {
      next();
      throw error;
    });
    const decorated = wrap(test);

    expect(decorated).toThrow(error);
    expect(spy).toHaveBeenCalled();
  });

  it("should compose multiple middlewares", () => {
    const order: string[] = [];

    function test() {
      order.push("fn");
      return "result";
    }

    const first = middleware((next) => {
      order.push("first-before");
      next();
      order.push("first-after");
    });

    const second = middleware((next) => {
      order.push("second-before");
      next();
      order.push("second-after");
    });

    const decorated = first(second(test));

    const result = decorated();
    expect(result).toBe("result");
    expect(order).toEqual(["first-before", "second-before", "fn", "second-after", "first-after"]);
  });

  it("should work as a parameterized middleware factory", () => {
    const spy = vi.fn();

    const featureAccess = (feature: string) =>
      middleware((next) => {
        if (feature === "blocked") {
          throw new Error(`Feature '${feature}' is not allowed`);
        }
        next();
      });

    function doSomething() {
      spy();
      return "done";
    }

    const allowed = featureAccess("allowed")(doSomething);
    expect(allowed()).toBe("done");
    expect(spy).toHaveBeenCalled();

    spy.mockClear();

    const blocked = featureAccess("blocked")(doSomething);
    expect(() => blocked()).toThrow("Feature 'blocked' is not allowed");
    expect(spy).not.toHaveBeenCalled();
  });

  it("should measure timing (example from docs)", () => {
    const spy = vi.fn();

    const time = middleware((next) => {
      const before = performance.now();
      next();
      const after = performance.now();
      spy(after - before);
    });

    function doSomething() {
      // simulate work
      for (let i = 0; i < 1000; i++) {
        /* noop */
      }
    }

    const decorated = time(doSomething);
    decorated();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBeGreaterThanOrEqual(0);
  });
});
