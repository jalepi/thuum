import { describe, expect, it, vi } from "bun:test";
import { middleware } from "./middleware";

describe("middleware async tests", () => {
  it("should pass through when next is called", async () => {
    const spy = vi.fn(() => Promise.resolve());

    const bypass = middleware(async (next) => {
      await next();
    });
    const decorated = bypass(spy);

    await decorated();
    expect(spy).toHaveBeenCalled();
  });

  it("should forward arguments to the original function", async () => {
    const spy = vi.fn();
    async function test(a: number, b: string, c: boolean) {
      spy(a, b, c);
      await Promise.resolve();
    }

    const bypass = middleware(async (next) => {
      await next();
    });
    const decorated = bypass(test);
    await decorated(1, "foo", true);

    expect(spy).toHaveBeenCalledWith(1, "foo", true);
  });

  it("should preserve the return value", async () => {
    async function test() {
      return await Promise.resolve(42);
    }

    const bypass = middleware(async (next) => {
      await next();
    });
    const decorated = bypass(test);

    expect(await decorated()).toBe(42);
  });

  it("should bind this context", async () => {
    const spy = vi.fn();
    async function test(this: unknown) {
      spy(this);
      await Promise.resolve();
    }

    const bypass = middleware(async (next) => {
      await next();
    });
    const obj = { test: bypass(test) };

    await obj.test();
    expect(spy).toHaveBeenCalledWith(obj);
  });

  it("should short-circuit when next is not called", async () => {
    const spy = vi.fn();
    async function test() {
      spy();
      return await Promise.resolve(1);
    }

    const shortCircuit = middleware(async (_next) => {
      await Promise.resolve();
      // noop - do not call next
    });
    const decorated = shortCircuit(test);

    expect(await decorated()).toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
  });

  it("should execute code before and after the function", async () => {
    const order: string[] = [];

    async function test() {
      order.push("fn");
      await Promise.resolve();
    }

    const wrap = middleware(async (next) => {
      order.push("before");
      await next();
      order.push("after");
    });
    const decorated = wrap(test);

    await decorated();
    expect(order).toEqual(["before", "fn", "after"]);
  });

  it("should allow middleware to throw and prevent execution", () => {
    const spy = vi.fn();
    const error = new Error("access denied");

    async function test() {
      spy();
      return await Promise.resolve(1);
    }

    const guard = middleware(async (_next) => {
      await Promise.resolve();
      throw error;
    });
    const decorated = guard(test);

    expect(decorated()).rejects.toThrow(error);
    expect(spy).not.toHaveBeenCalled();
  });

  it("should allow middleware to throw after execution", () => {
    const spy = vi.fn();
    const error = new Error("post-execution failure");

    async function test() {
      spy();
      await Promise.resolve();
    }

    const wrap = middleware(async (next) => {
      await next();
      throw error;
    });
    const decorated = wrap(test);

    expect(decorated()).rejects.toThrow(error);
    expect(spy).toHaveBeenCalled();
  });

  it("should compose multiple middlewares", async () => {
    const order: string[] = [];

    async function test() {
      order.push("fn");
      await Promise.resolve();
      return "result";
    }

    const first = middleware(async (next) => {
      order.push("first-before");
      await next();
      order.push("first-after");
    });

    const second = middleware(async (next) => {
      order.push("second-before");
      await next();
      order.push("second-after");
    });

    const decorated = first(second(test));

    const result = await decorated();
    expect(result).toBe("result");
    expect(order).toEqual(["first-before", "second-before", "fn", "second-after", "first-after"]);
  });

  it("should work as a parameterized middleware factory", async () => {
    const spy = vi.fn();

    const featureAccess = (feature: string) =>
      middleware(async (next) => {
        const allowed = await Promise.resolve(feature !== "blocked");
        if (!allowed) {
          throw new Error(`Feature '${feature}' is not allowed`);
        }
        await next();
      });

    async function doSomething() {
      spy();
      return await Promise.resolve("done");
    }

    const allowed = featureAccess("allowed")(doSomething);
    expect(await allowed()).toBe("done");
    expect(spy).toHaveBeenCalled();

    spy.mockClear();

    const blocked = featureAccess("blocked")(doSomething);
    expect(blocked()).rejects.toThrow("Feature 'blocked' is not allowed");
    expect(spy).not.toHaveBeenCalled();
  });

  it("should measure timing (example from docs)", async () => {
    const spy = vi.fn();

    const time = middleware(async (next) => {
      const before = performance.now();
      await next();
      const after = performance.now();
      spy(after - before);
    });

    async function doSomething() {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    const decorated = time(doSomething);
    await decorated();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBeGreaterThanOrEqual(10);
  });

  it("should handle a sync function wrapped with async middleware", () => {
    function syncFn() {
      return 99;
    }

    const bypass = middleware(async (next) => {
      await next();
    });
    const decorated = bypass(syncFn);

    expect(decorated()).resolves.toBe(99);
  });

  it("should handle rejection from the original function", () => {
    const error = new Error("original failure");

    async function test() {
      await Promise.resolve();
      throw error;
    }

    const bypass = middleware(async (next) => {
      await next();
    });
    const decorated = bypass(test);

    expect(decorated()).rejects.toThrow(error);
  });
});
