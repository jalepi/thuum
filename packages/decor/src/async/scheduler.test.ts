import { describe, it, expect, vi } from "bun:test";
import { continuation, scheduler, type Scheduler } from "./scheduler";

describe("continuation tests", () => {
  it("should execute a single callable immediately", async () => {
    const next = continuation();

    const result = await next(() => 42);

    expect(result).toBe(42);
  });

  it("should execute callables sequentially in FIFO order", async () => {
    const next = continuation();
    const results: number[] = [];

    await Promise.all([
      next(() => {
        results.push(1);
        return 1;
      }),
      next(() => {
        results.push(2);
        return 2;
      }),
      next(() => {
        results.push(3);
        return 3;
      }),
    ]);

    expect(results).toEqual([1, 2, 3]);
  });

  it("should maintain order even with varying async durations", async () => {
    const next = continuation();
    const results: string[] = [];

    await Promise.all([
      next(async () => {
        await new Promise((r) => setTimeout(r, 30));
        results.push("slow");
        return "slow";
      }),
      next(async () => {
        await new Promise((r) => setTimeout(r, 5));
        results.push("fast");
        return "fast";
      }),
      next(() => {
        results.push("instant");
        return "instant";
      }),
    ]);

    expect(results).toEqual(["slow", "fast", "instant"]);
  });

  it("should isolate failures — one rejection doesn't break the chain", async () => {
    const next = continuation();

    const p1 = next(() => "first");
    const p2 = next(() => {
      throw new Error("oops");
    });
    const p3 = next(() => "third");

    expect(await p1).toBe("first");
    expect(p2).rejects.toThrow("oops");
    expect(await p3).toBe("third");
  });

  it("should isolate async rejections", async () => {
    const next = continuation();

    const p1 = next(() => Promise.resolve("a"));
    const p2 = next(() => Promise.reject(new Error("fail")));
    const p3 = next(() => Promise.resolve("c"));

    expect(await p1).toBe("a");
    expect(p2).rejects.toThrow("fail");
    expect(await p3).toBe("c");
  });

  it("should resolve with the callable's return value", async () => {
    const next = continuation();

    const r1 = await next(() => "hello");
    const r2 = await next(() => 123);
    const r3 = await next(() => ({ key: "value" }));

    expect(r1).toBe("hello");
    expect(r2).toBe(123);
    expect(r3).toEqual({ key: "value" });
  });

  it("should support async callables", async () => {
    const next = continuation();

    const result = await next(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return "async result";
    });

    expect(result).toBe("async result");
  });

  it("should delay execution until seed resolves", async () => {
    const order: string[] = [];

    let resolveSeed!: () => void;
    const seed = new Promise<void>((r) => {
      resolveSeed = r;
    });

    const next = continuation(seed);

    const p1 = next(() => {
      order.push("first");
      return "first";
    });
    const p2 = next(() => {
      order.push("second");
      return "second";
    });

    // Nothing should have run yet
    await Promise.resolve();
    expect(order).toEqual([]);

    // Now resolve the seed
    resolveSeed();

    expect(await p1).toBe("first");
    expect(await p2).toBe("second");
    expect(order).toEqual(["first", "second"]);
  });

  it("should prevent concurrent execution", async () => {
    const next = continuation();
    let concurrent = 0;
    let maxConcurrent = 0;

    const task = async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise((r) => setTimeout(r, 10));
      concurrent--;
      return maxConcurrent;
    };

    await Promise.all([next(task), next(task), next(task), next(task), next(task)]);

    expect(maxConcurrent).toBe(1);
  });

  it("should handle many rapid enqueues", async () => {
    const next = continuation();
    const count = 100;
    const results: number[] = [];

    const promises = Array.from({ length: count }, (_, i) =>
      next(() => {
        results.push(i);
        return i;
      }),
    );

    await Promise.all(promises);

    expect(results).toEqual(Array.from({ length: count }, (_, i) => i));
  });

  it("should handle mixed sync and async callables in order", async () => {
    const next = continuation();
    const results: string[] = [];

    await Promise.all([
      next(() => {
        results.push("sync-1");
        return "sync-1";
      }),
      next(async () => {
        await new Promise((r) => setTimeout(r, 15));
        results.push("async-1");
        return "async-1";
      }),
      next(() => {
        results.push("sync-2");
        return "sync-2";
      }),
      next(async () => {
        await new Promise((r) => setTimeout(r, 5));
        results.push("async-2");
        return "async-2";
      }),
    ]);

    expect(results).toEqual(["sync-1", "async-1", "sync-2", "async-2"]);
  });
});

describe("scheduler tests", () => {
  it("should create a decorator from a scheduler", () => {
    const next = continuation();
    const decor = scheduler(next);

    expect(decor).toBeFunction();
  });

  it("should decorate a function and preserve its behavior", async () => {
    const next = continuation();
    const sequential = scheduler(next);

    const add = (a: number, b: number) => a + b;
    const scheduledAdd = sequential(add);

    expect(await scheduledAdd(2, 3)).toBe(5);
  });

  it("should schedule async functions sequentially", async () => {
    const next = continuation();
    const sequential = scheduler(next);

    const results: string[] = [];
    const process = async (id: string): Promise<string> => {
      await new Promise((r) => setTimeout(r, Math.random() * 25));
      results.push(id);
      return id + " done";
    };

    const scheduledProcess = sequential(process);

    const output = await Promise.all(["a", "b", "c", "d"].map((id) => scheduledProcess(id)));

    expect(output).toEqual(["a done", "b done", "c done", "d done"]);
    expect(results).toEqual(["a", "b", "c", "d"]);
  });

  it("should serialize concurrent calls to prevent races", async () => {
    const next = continuation();
    const sequential = scheduler(next);

    let concurrent = 0;
    let maxConcurrent = 0;

    const task = sequential(async (id: number) => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise((r) => setTimeout(r, 10));
      concurrent--;
      return id;
    });

    await Promise.all([task(1), task(2), task(3), task(4), task(5)]);

    expect(maxConcurrent).toBe(1);
  });

  it("should handle errors in decorated functions without breaking the queue", async () => {
    const next = continuation();
    const sequential = scheduler(next);

    const fn = sequential((n: number) => {
      if (n === 2) throw new Error("bad number");
      return n * 10;
    });

    const p1 = fn(1);
    const p2 = fn(2);
    const p3 = fn(3);

    expect(await p1).toBe(10);
    expect(p2).rejects.toThrow("bad number");
    expect(await p3).toBe(30);
  });

  it("should work with sync functions, wrapping result in a promise", async () => {
    const next = continuation();
    const sequential = scheduler(next);

    const multiply = (a: number, b: number) => a * b;
    const scheduledMultiply = sequential(multiply);

    const result = scheduledMultiply(3, 4);
    expect(result).toBeInstanceOf(Promise);
    expect(await result).toBe(12);
  });

  it("should share a queue across multiple decorated functions", async () => {
    const next = continuation();
    const sequential = scheduler(next);

    const order: string[] = [];

    const readOp = sequential(async (path: string) => {
      await new Promise((r) => setTimeout(r, 10));
      order.push(`read:${path}`);
      return `content of ${path}`;
    });

    const writeOp = sequential(async (path: string, data: string) => {
      await new Promise((r) => setTimeout(r, 10));
      order.push(`write:${path}=${data}`);
    });

    const p1 = readOp("/file.txt");
    const p2 = writeOp("/file.txt", "updated");
    const p3 = readOp("/file.txt");

    await Promise.all([p1, p2, p3]);

    expect(order).toEqual(["read:/file.txt", "write:/file.txt=updated", "read:/file.txt"]);
  });

  it("should preserve function arguments correctly", async () => {
    const next = continuation();
    const sequential = scheduler(next);

    const spy = vi.fn((a: string, b: number, c: boolean) => ({ a, b, c }));
    const scheduled = sequential(spy);

    const result = await scheduled("hello", 42, true);

    expect(spy).toHaveBeenCalledWith("hello", 42, true);
    expect(result).toEqual({ a: "hello", b: 42, c: true });
  });

  it("should work with a custom immediate scheduler", async () => {
    const immediate: Scheduler = (callable) => Promise.resolve().then(callable);

    const decor = scheduler(immediate);
    const fn = decor((x: number) => x * 2);

    const result = await fn(5);
    expect(result).toBe(10);
  });

  it("should work with a custom throttled scheduler", async () => {
    const delays: number[] = [];
    let lastTime = Date.now();

    const throttled: Scheduler = (() => {
      let last = Promise.resolve() as Promise<unknown>;
      return <T>(callable: () => T | Promise<T>): Promise<T> => {
        const p = last
          .then(() => new Promise<void>((r) => setTimeout(r, 20)))
          .then(() => {
            const now = Date.now();
            delays.push(now - lastTime);
            lastTime = now;
            return callable();
          });
        last = p.catch(() => undefined);
        return p;
      };
    })();

    const decor = scheduler(throttled);
    const fn = decor((x: number) => x + 1);

    const results = await Promise.all([fn(1), fn(2), fn(3)]);

    expect(results).toEqual([2, 3, 4]);
    // Each call should have at least ~20ms delay
    expect(delays.every((d) => d >= 15)).toBe(true);
  });

  it("should maintain execution order for fire-and-forget calls", async () => {
    const next = continuation();
    const sequential = scheduler(next);
    const order: number[] = [];

    const task = sequential(async (id: number) => {
      await new Promise((r) => setTimeout(r, Math.random() * 20));
      order.push(id);
      return id;
    });

    // Fire without awaiting individually
    const promises = [task(1), task(2), task(3), task(4), task(5)];

    await Promise.all(promises);
    expect(order).toEqual([1, 2, 3, 4, 5]);
  });

  it("should handle void-returning functions", async () => {
    const next = continuation();
    const sequential = scheduler(next);
    const effects: string[] = [];

    const sideEffect = sequential((msg: string) => {
      effects.push(msg);
    });

    await sideEffect("first");
    await sideEffect("second");

    expect(effects).toEqual(["first", "second"]);
  });

  it("should support decorating the same function with different schedulers", async () => {
    const queue1 = continuation();
    const queue2 = continuation();
    const sched1 = scheduler(queue1);
    const sched2 = scheduler(queue2);

    const order: string[] = [];

    const fn = async (label: string) => {
      await new Promise((r) => setTimeout(r, 10));
      order.push(label);
      return label;
    };

    const scheduled1 = sched1(fn);
    const scheduled2 = sched2(fn);

    // These are on independent queues, so they can run concurrently
    const [r1, r2] = await Promise.all([scheduled1("q1-a"), scheduled2("q2-a")]);

    expect(r1).toBe("q1-a");
    expect(r2).toBe("q2-a");
    // Both should have completed (order may vary since they're on separate queues)
    expect(order).toContain("q1-a");
    expect(order).toContain("q2-a");
  });

  it("should handle rapidly alternating success and failure", async () => {
    const next = continuation();
    const sequential = scheduler(next);
    const results: { id: number; status: "ok" | "err" }[] = [];

    const fn = sequential(async (id: number) => {
      await new Promise((r) => setTimeout(r, 5));
      if (id % 2 === 0) throw new Error(`fail-${id.toFixed(0)}`);
      results.push({ id, status: "ok" });
      return id;
    });

    const promises = [1, 2, 3, 4, 5].map((id) =>
      fn(id)
        .then(() => results.push({ id, status: "ok" as const }))
        .catch(() => results.push({ id, status: "err" as const })),
    );

    await Promise.all(promises);

    // Odd numbers succeed, even numbers fail — but all execute in order
    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === "ok").length).toBeGreaterThan(0);
    expect(statuses.filter((s) => s === "err").length).toBeGreaterThan(0);
  });

  it("should work as a concurrency limiter for resource access", async () => {
    const next = continuation();
    const sequential = scheduler(next);

    const resource = { value: 0 };

    const increment = sequential(async () => {
      const current = resource.value;
      await new Promise((r) => setTimeout(r, 10));
      // Without serialization, this would race
      resource.value = current + 1;
    });

    await Promise.all(Array.from({ length: 10 }, () => increment()));

    // All 10 increments applied correctly (no race condition)
    expect(resource.value).toBe(10);
  });
});
