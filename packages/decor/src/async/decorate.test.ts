import { describe, expect, it, vi } from "bun:test";
import { decorate } from "./decorate";

describe("decorate async tests", () => {
  it("should not throw", () => {
    const spy = vi.fn(() => Promise.resolve());

    const decorated = decorate(spy, async (fn, ...args) => {
      await fn(...args);
    });

    expect(decorated()).resolves.toBeUndefined();
  });

  it("should receive args", async () => {
    const spy = vi.fn();
    async function test(_a: number, _b: string, _c: boolean) {
      await Promise.resolve();
    }

    const decorated = decorate(test, async (fn, ...args) => {
      spy(...args);
      await fn(...args);
    });
    await decorated(1, "foo", true);

    expect(spy).toHaveBeenCalledWith(1, "foo", true);
  });

  it("should return value", async () => {
    async function test() {
      return Promise.resolve(42);
    }

    const decorated = decorate(test, async (fn, ...args) => {
      return await fn(...args);
    });

    expect(await decorated()).toBe(42);
  });

  it("should bind this", async () => {
    const spy = vi.fn();
    async function test(this: unknown) {
      spy(this);
      return Promise.resolve();
    }

    const decorated = decorate(test, async (fn, ...args) => {
      await fn(...args);
    });
    const obj = { test: decorated };

    await obj.test();
    expect(spy).toHaveBeenCalledWith(obj);
  });

  it("should substitute args", async () => {
    const spy = vi.fn();
    async function test(a: number, b: string, c: boolean) {
      spy(a, b, c);
      return Promise.resolve();
    }

    const decorated = decorate(test, async (fn, a, b, c) => {
      await fn(a + 1, b + "1", !c);
    });
    await decorated(1, "foo", true);

    expect(spy).toHaveBeenCalledWith(1 + 1, "foo" + "1", !true);
  });

  it("should substitute return", async () => {
    const spy = vi.fn();
    async function test() {
      spy();
      return Promise.resolve(1);
    }

    const decorated = decorate(test, async (fn, ...args) => (await fn(...args)) + 1);

    expect(await decorated()).toBe(1 + 1);
    expect(spy).toHaveBeenCalled();
  });

  it("should short circuit", async () => {
    const spy = vi.fn();
    function test() {
      spy();
      return Promise.resolve(1);
    }

    const decorated = decorate(test, async (_fn, ..._args) => {
      await Promise.resolve();
      return undefined as unknown as number;
    }) as (...args: unknown[]) => Promise<unknown>;

    expect(await decorated()).toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
  });

  it("should handle rejection", () => {
    const error = new Error("async failure");
    function test() {
      return Promise.reject(error);
    }

    const decorated = decorate(test, async (fn, ...args) => await fn(...args));

    expect(decorated()).rejects.toThrow(error);
  });

  it("should decorate a sync function", async () => {
    function add(a: number, b: number) {
      return a + b;
    }

    const decorated = decorate(add, async (fn, a, b) => {
      return fn(a, b);
    });

    const result = decorated(2, 3);
    expect(result).toBeInstanceOf(Promise);
    expect(await result).toBe(5);
  });

  it("should retry on failure", async () => {
    let calls = 0;
    async function flaky() {
      calls++;
      if (calls === 1) throw new Error("fail");
      return await Promise.resolve("ok");
    }

    const decorated = decorate(flaky, async (fn, ...args) => {
      try {
        return await fn(...args);
      } catch {
        await new Promise((r) => setTimeout(r, 10));
        return await fn(...args);
      }
    });

    expect(await decorated()).toBe("ok");
    expect(calls).toBe(2);
  });

  it("should timeout", () => {
    async function slow() {
      await new Promise((r) => setTimeout(r, 5000));
      return "done";
    }

    const decorated = decorate(slow, async (fn, ...args) => {
      return await Promise.race([
        fn(...args),
        new Promise<never>((_, reject) =>
          setTimeout(() => {
            reject(new Error("Timeout"));
          }, 10),
        ),
      ]);
    });

    expect(decorated()).rejects.toThrow("Timeout");
  });

  it("should cache results", async () => {
    const spy = vi.fn(async (key: string) => {
      return await Promise.resolve(`value-${key}`);
    });

    const cache = new Map<string, string>();

    const decorated = decorate(spy, async (fn, key) => {
      const cached = cache.get(key);
      if (cached) return cached;

      const result = await fn(key);
      cache.set(key, result);
      return result;
    });

    expect(await decorated("a")).toBe("value-a");
    expect(await decorated("a")).toBe("value-a");
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
