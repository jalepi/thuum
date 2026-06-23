import { describe, it, expect, vi } from "bun:test";
import { transform } from "./transform";
import type { Any, Result } from "./types";

describe("transform tests", () => {
  it("should transform bypass target function", () => {
    const spy = vi.fn();

    const increment = (n: number) => n + 1;
    expect(increment(1)).toBe(2);

    const subject = transform(increment, (fn, ...args) => {
      const r = fn(...args);
      spy(r, ...args);
      return r;
    });

    expect(subject(1)).toBe(2);
    expect(spy).toHaveBeenCalledWith(2, 1);
  });

  it("should transform modify args of function", () => {
    const reverse = (s: string) => s.split("").reverse().join("");
    expect(reverse("hello!")).toBe("!olleh");

    // change function signature to receive multiple string values
    const subject = transform(reverse, (fn, ...values: string[]) => {
      return values.map((s) => fn(s)).join(" ");
    });

    expect(subject("hello", "world", "yay")).toBe("olleh dlrow yay");
  });

  it("should transform function into safe version", () => {
    const unsafe = (n: number) => {
      if (n > 0) {
        return "nice";
      } else {
        throw new Error();
      }
    };

    expect(() => unsafe(1)).not.toThrowError();
    expect(() => unsafe(-1)).toThrowError();

    const result = <Args extends Any[], R>(fn: (...args: Args) => R, ...args: Args): Result<R> => {
      try {
        return { ok: true, value: fn(...args) } as const;
      } catch (error) {
        return { ok: false, error } as const;
      }
    };

    const safe = transform(unsafe, result);

    expect(safe(2)).toStrictEqual({ ok: true, value: "nice" });
    expect(safe(-2)).toStrictEqual({ ok: false, error: new Error() });
  });
});

describe("transform async tests", () => {
  it("should transform bypass async target function", async () => {
    const spy = vi.fn();

    const increment = async (n: number) => await Promise.resolve(n + 1);
    expect(await increment(1)).toBe(2);

    const subject = transform(increment, async (fn, ...args) => {
      const r = await fn(...args);
      spy(r, ...args);
      return r;
    });

    expect(await subject(1)).toBe(2);
    expect(spy).toHaveBeenCalledWith(2, 1);
  });

  it("should transform modify args of async function", async () => {
    const reverse = async (s: string) => await Promise.resolve(s.split("").reverse().join(""));
    expect(await reverse("hello!")).toBe("!olleh");

    // change function signature to receive multiple string values
    const subject = transform(reverse, async (fn, ...values: string[]) => {
      const results = await Promise.all(values.map((s) => fn(s)));
      return results.join(" ");
    });

    expect(await subject("hello", "world", "yay")).toBe("olleh dlrow yay");
  });

  it("should transform async function into safe version", async () => {
    const unsafe = async (n: number) => {
      if (n > 0) {
        return await Promise.resolve("nice");
      } else {
        return await Promise.reject(new Error());
      }
    };

    expect(unsafe(1)).resolves.toBe("nice");
    expect(unsafe(-1)).rejects.toThrowError();

    const result = async <Args extends Any[], R>(
      fn: (...args: Args) => Promise<R>,
      ...args: Args
    ): Promise<Result<R>> => {
      try {
        return { ok: true, value: await fn(...args) } as const;
      } catch (error) {
        return { ok: false, error } as const;
      }
    };

    const safe = transform(unsafe, result);

    expect(await safe(2)).toStrictEqual({ ok: true, value: "nice" });
    expect(await safe(-2)).toStrictEqual({ ok: false, error: new Error() });
  });

  it("should transform a sync function into an async one", async () => {
    const add = (a: number, b: number) => a + b;
    expect(add(1, 2)).toBe(3);

    const subject = transform(add, async (fn, a, b) => {
      return await Promise.resolve(fn(a, b));
    });

    const result = subject(2, 3);
    expect(result).toBeInstanceOf(Promise);
    expect(await result).toBe(5);
  });

  it("should transform return type asynchronously", async () => {
    const getUser = async (id: number) => await Promise.resolve({ id, name: "Alice" });

    // Transform to return just the name as a string
    const getUserName = transform(getUser, async (fn, id: number) => {
      const user = await fn(id);
      return user.name;
    });

    expect(await getUserName(1)).toBe("Alice");
  });

  it("should handle rejection from target function", () => {
    const error = new Error("async failure");
    const failing = async () => {
      return await Promise.reject(error);
    };

    const subject = transform(failing, async (fn, ...args) => {
      return await fn(...args);
    });

    expect(subject()).rejects.toThrow(error);
  });

  it("should transform with retry and delay", async () => {
    let calls = 0;
    const flaky = async () => {
      calls++;
      return calls === 1 ? Promise.reject(new Error("fail")) : Promise.resolve("ok");
    };

    const subject = transform(flaky, async (fn, ...args) => {
      try {
        return await fn(...args);
      } catch {
        await new Promise((r) => setTimeout(r, 10));
        return await fn(...args);
      }
    });

    expect(await subject()).toBe("ok");
    expect(calls).toBe(2);
  });

  it("should transform with timeout", () => {
    const slow = async () => {
      await new Promise((r) => setTimeout(r, 5000));
      return "done";
    };

    const subject = transform(slow, async (fn, ...args) => {
      return await Promise.race([
        fn(...args),
        new Promise<never>((_, reject) =>
          setTimeout(() => {
            reject(new Error("Timeout"));
          }, 10),
        ),
      ]);
    });

    expect(subject()).rejects.toThrow("Timeout");
  });

  it("should transform with caching", async () => {
    const spy = vi.fn(async (key: string) => {
      return await Promise.resolve(`value-${key}`);
    });

    const cache = new Map<string, string>();

    const subject = transform(spy, async (fn, key) => {
      const cached = cache.get(key);
      if (cached) return cached;

      const result = await fn(key);
      cache.set(key, result);
      return result;
    });

    expect(await subject("a")).toBe("value-a");
    expect(await subject("a")).toBe("value-a");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("should transform args and return type together", async () => {
    // Original: takes a single number, returns a number
    const square = async (n: number) => await Promise.resolve(n * n);

    // Transform: takes multiple numbers, returns their squares as a formatted string
    const subject = transform(square, async (fn, ...nums: number[]) => {
      const results = await Promise.all(nums.map((n) => fn(n)));
      return results.join(", ");
    });

    expect(await subject(2, 3, 4)).toBe("4, 9, 16");
  });

  it("should bind this for async transform", async () => {
    const spy = vi.fn();
    async function test(this: unknown) {
      spy(this);
      return Promise.resolve();
    }

    const subject = transform(test, async (fn, ...args) => {
      await fn(...args);
    });
    const obj = { test: subject };

    await obj.test();
    expect(spy).toHaveBeenCalledWith(obj);
  });
});
