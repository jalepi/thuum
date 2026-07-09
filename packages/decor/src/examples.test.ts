import { describe, expect, it } from "bun:test";
import { decorator as asyncDecorator, middleware as asyncMiddleware, probe as asyncProbe } from "./async/index";
import { continuation, scheduler } from "./async/scheduler";
import { attempt, decorate, decorator, middleware, probe } from "./index";
import { transform } from "./transform";

// =============================================================================
// MOTIVATION — Core Use Cases
// =============================================================================

describe("Observability", () => {
  // See what happens without changing what happens.
  // Emit structured telemetry around invocation. Never alters behavior or return values.

  it("structured logging — observe arguments and results", () => {
    const logs: string[] = [];

    const withLogging = (name: string) =>
      probe((...args: unknown[]) => {
        logs.push(`[${name}] called with: ${JSON.stringify(args)}`);
        return (result) => {
          if (result.ok) {
            logs.push(`[${name}] returned: ${JSON.stringify(result.value)}`);
          } else {
            logs.push(`[${name}] threw: ${(result.error as Error).message}`);
          }
        };
      });

    const add = withLogging("add")((a: number, b: number) => a + b);

    expect(add(2, 3)).toBe(5);
    expect(logs).toEqual(["[add] called with: [2,3]", "[add] returned: 5"]);
  });

  it("structured logging — observes errors without altering throw behavior", () => {
    const logs: string[] = [];

    const withLogging = (name: string) =>
      probe((...args: unknown[]) => {
        logs.push(`[${name}] called with: ${JSON.stringify(args)}`);
        return (result) => {
          if (result.ok) {
            logs.push(`[${name}] returned: ${JSON.stringify(result.value)}`);
          } else {
            logs.push(`[${name}] threw: ${(result.error as Error).message}`);
          }
        };
      });

    const fail = withLogging("fail")(() => {
      throw new Error("boom");
    });

    expect(() => fail()).toThrow("boom");
    expect(logs).toEqual(["[fail] called with: []", "[fail] threw: boom"]);
  });

  it("execution timing — measure duration without altering flow", () => {
    const timings: string[] = [];

    const withTiming = (label: string) =>
      middleware((next) => {
        const start = performance.now();
        next();
        const elapsed = performance.now() - start;
        timings.push(`[${label}] ${elapsed.toFixed(2)}ms`);
      });

    const compute = withTiming("compute")((x: number) => x * x);

    expect(compute(42)).toBe(1764);
    expect(timings).toHaveLength(1);
    expect(timings[0]).toMatch(/^\[compute\] \d+\.\d+ms$/);
  });

  it("call counting — track invocation frequency", () => {
    const logs: string[] = [];

    const withCounter = (name: string) => {
      let count = 0;
      return probe((..._args: unknown[]) => {
        count++;
        logs.push(`[${name}] invocation #${count.toFixed(0)}`);
      });
    };

    const greet = withCounter("greet")((name: string) => `Hello, ${name}!`);

    expect(greet("Alice")).toBe("Hello, Alice!");
    expect(greet("Bob")).toBe("Hello, Bob!");
    expect(logs).toEqual(["[greet] invocation #1", "[greet] invocation #2"]);
  });

  it("tracing spans — emit span-like context for distributed tracing", () => {
    const spans: { traceId: string; spanName: string; direction: string }[] = [];
    let traceCounter = 0;

    const withTracing = (spanName: string) =>
      probe((..._args: unknown[]) => {
        const traceId = `trace-${(++traceCounter).toFixed(0)}`;
        spans.push({ traceId, spanName, direction: "enter" });
        return (result) => {
          spans.push({
            traceId,
            spanName,
            direction: result.ok ? "ok" : "error",
          });
        };
      });

    const add = withTracing("add")((a: number, b: number) => a + b);

    expect(add(1, 2)).toBe(3);
    expect(spans).toEqual([
      { traceId: "trace-1", spanName: "add", direction: "enter" },
      { traceId: "trace-1", spanName: "add", direction: "ok" },
    ]);
  });
});

describe("Precondition Guards", () => {
  // Prevent execution when a contract is unmet.
  // Short-circuit with a throw or early return. Guards do not produce Result<T>.

  it("disposed check — prevent use-after-dispose", () => {
    const guardDisposed = (isDisposed: () => boolean) =>
      decorator((fn, ...args: unknown[]) => {
        if (isDisposed()) {
          throw new Error("Cannot invoke: resource is disposed");
        }
        return fn(...args);
      });

    let disposed = false;
    const send = guardDisposed(() => disposed)((msg: string) => msg);

    expect(send("hello")).toBe("hello");

    disposed = true;
    expect(() => send("world")).toThrow("Cannot invoke: resource is disposed");
  });

  it("already-initialized / idempotency — execute only once", () => {
    let callCount = 0;

    const once = (() => {
      let initialized = false;
      return middleware((next) => {
        if (initialized) return;
        initialized = true;
        next();
      });
    })();

    const setup = once(() => {
      callCount++;
    });

    setup();
    setup();
    setup();
    expect(callCount).toBe(1);
  });

  it("input validation — reject invalid arguments", () => {
    const validatePositive = decorator((fn, n: number) => {
      if (n < 0) throw new RangeError(`Expected positive number, got ${n.toFixed(0)}`);
      return fn(n);
    });

    const sqrt = validatePositive(Math.sqrt);

    expect(sqrt(16)).toBe(4);
    expect(() => sqrt(-1)).toThrow("Expected positive number, got -1");
  });

  it("invariant assertion — fail fast on violated assumptions", () => {
    const assertNonNull = <T>(label: string) =>
      decorator((fn, value: T) => {
        if (value == null) {
          throw new TypeError(`Invariant violation: ${label} must not be null`);
        }
        return fn(value);
      });

    const processUser = assertNonNull<{ name: string }>("user")((user) => {
      return user.name.toUpperCase();
    });

    expect(processUser({ name: "Alice" })).toBe("ALICE");
    expect(() => processUser(null as unknown as { name: string })).toThrow(
      "Invariant violation: user must not be null",
    );
    expect(() => processUser(undefined as unknown as { name: string })).toThrow(
      "Invariant violation: user must not be null",
    );
  });
});

describe("Resilience", () => {
  // Control failure modes declaratively.
  // Protect against transient and systemic failures.

  it("result pattern — convert throws into values with attempt", () => {
    const divide = (a: number, b: number) => {
      if (b === 0) throw new Error("Divide by zero");
      return a / b;
    };

    const safeDivide = attempt(divide);

    const success = safeDivide(10, 2);
    expect(success).toEqual({ ok: true, value: 5 });

    const failure = safeDivide(10, 0);
    expect(failure.ok).toBe(false);
    expect((failure as { ok: false; error: Error }).error.message).toBe("Divide by zero");
  });

  it("retry with exponential backoff — rethrows on exhaustion", async () => {
    const withRetry = (maxAttempts: number, baseDelayMs: number) =>
      asyncDecorator(async (fn, ...args: unknown[]) => {
        let lastError: unknown;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            return await fn(...args);
          } catch (error) {
            lastError = error;
            if (attempt < maxAttempts) {
              const delay = baseDelayMs * 2 ** (attempt - 1);
              await new Promise((r) => setTimeout(r, delay));
            }
          }
        }
        throw lastError;
      });

    let callCount = 0;
    const unstable = withRetry(
      3,
      10,
    )(async (threshold: number) => {
      callCount++;
      if (callCount < threshold) throw new Error("transient failure");
      return await Promise.resolve("success");
    });

    // Succeeds on 3rd attempt
    callCount = 0;
    const result = await unstable(3);
    expect(result).toBe("success");
    expect(callCount).toBe(3);

    // Exhausts all retries
    callCount = 0;
    expect(unstable(10)).rejects.toThrow("transient failure");
    expect(callCount).toBe(3); // 3 attempts for this round
  });

  it("timeout — reject after deadline", async () => {
    const withTimeout = (ms: number) =>
      asyncDecorator(async (fn, ...args: unknown[]) => {
        return await Promise.race([
          fn(...args),
          new Promise<never>((_, reject) =>
            setTimeout(() => {
              reject(new Error("Timeout"));
            }, ms),
          ),
        ]);
      });

    const fast = withTimeout(100)(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return "done";
    });

    const slow = withTimeout(10)(async () => {
      await new Promise((r) => setTimeout(r, 100));
      return "done";
    });

    expect(await fast()).toBe("done");
    expect(slow()).rejects.toThrow("Timeout");
  });

  it("circuit breaker — fast-fail after threshold", async () => {
    const withCircuitBreaker = (threshold: number, cooldownMs: number) => {
      let failures = 0;
      let openUntil = 0;

      return asyncDecorator(async (fn, ...args: unknown[]) => {
        if (Date.now() < openUntil) {
          throw new Error("Circuit is open — request rejected");
        }
        try {
          const result = await fn(...args);
          failures = 0;
          return result;
        } catch (error) {
          failures++;
          if (failures >= threshold) {
            openUntil = Date.now() + cooldownMs;
          }
          throw error;
        }
      });
    };

    let shouldFail = true;
    const service = withCircuitBreaker(
      2,
      100,
    )(async () => {
      if (shouldFail) throw new Error("service down");
      return await Promise.resolve("ok");
    });

    // Trip the circuit breaker
    expect(service()).rejects.toThrow("service down");
    expect(service()).rejects.toThrow("service down");

    // Circuit is now open — fast-fails without calling the function
    expect(service()).rejects.toThrow("Circuit is open — request rejected");

    // Wait for cooldown
    await new Promise((r) => setTimeout(r, 110));
    shouldFail = false;
    expect(await service()).toBe("ok");
  });
});

// =============================================================================
// MOTIVATION — Recipes
// =============================================================================

describe("Lifecycle Hooks", () => {
  // Trigger setup or teardown around execution.

  it("ensure-initialized — lazily initialize a resource before first use", async () => {
    const events: string[] = [];

    const ensureInitialized = (init: () => Promise<void>) => {
      let initialized = false;
      return asyncMiddleware(async (next) => {
        if (!initialized) {
          await init();
          initialized = true;
        }
        await next();
      });
    };

    const withDb = ensureInitialized(() => {
      events.push("connecting");
      return Promise.resolve();
    });

    const query = withDb(async (sql: string) => {
      events.push(`query:${sql}`);
      return await Promise.resolve(`result:${sql}`);
    });

    expect(await query("SELECT 1")).toBe("result:SELECT 1");
    expect(await query("SELECT 2")).toBe("result:SELECT 2");
    expect(events).toEqual(["connecting", "query:SELECT 1", "query:SELECT 2"]);
  });

  it("before/after hooks — resource acquire/release", () => {
    const events: string[] = [];

    const withHooks = (before: () => void, after: () => void) =>
      middleware((next) => {
        before();
        try {
          next();
        } finally {
          after();
        }
      });

    const withTransaction = withHooks(
      () => events.push("BEGIN"),
      () => events.push("COMMIT"),
    );

    const save = withTransaction((data: string) => {
      events.push(`Saving: ${data}`);
    });

    save("record");
    expect(events).toEqual(["BEGIN", "Saving: record", "COMMIT"]);
  });

  it("before/after hooks — after runs even on error", () => {
    const events: string[] = [];

    const withHooks = (before: () => void, after: () => void) =>
      middleware((next) => {
        before();
        try {
          next();
        } finally {
          after();
        }
      });

    const withCleanup = withHooks(
      () => events.push("acquire"),
      () => events.push("release"),
    );

    const failing = withCleanup(() => {
      throw new Error("oops");
    });

    expect(() => failing()).toThrow("oops");
    expect(events).toEqual(["acquire", "release"]);
  });
});

describe("Flow Control", () => {
  // Govern when and how often execution happens.

  it("throttle — limit invocation rate", () => {
    const throttle = (limitMs: number) => {
      let lastCall = 0;
      return decorator((fn, ...args: unknown[]) => {
        const now = Date.now();
        if (now - lastCall < limitMs) return undefined;
        lastCall = now;
        return fn(...args);
      });
    };

    const calls: number[] = [];
    const throttled = throttle(50)((x: number) => {
      calls.push(x);
      return x;
    });

    // First call goes through
    expect(throttled(1)).toBe(1);
    // Immediate second call is throttled
    expect(throttled(2)).toBeUndefined();
    expect(calls).toEqual([1]);
  });

  it("debounce — delay until activity settles", async () => {
    const debounce = (waitMs: number) => {
      let timer: ReturnType<typeof setTimeout> | null = null;
      return decorator((fn, ...args: unknown[]) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => fn(...args), waitMs);
      });
    };

    const calls: string[] = [];
    const debounced = debounce(30)((value: string) => {
      calls.push(value);
    });

    debounced("a");
    debounced("b");
    debounced("c");

    // Nothing executed yet
    expect(calls).toEqual([]);

    // Wait for debounce to settle
    await new Promise((r) => setTimeout(r, 50));
    expect(calls).toEqual(["c"]);
  });

  it("serialization (FIFO) — ensure sequential execution with scheduler + continuation", async () => {
    const next = continuation();
    const sequential = scheduler(next);

    const order: string[] = [];
    const process = sequential(async (id: string) => {
      await new Promise((r) => setTimeout(r, Math.random() * 20));
      order.push(id);
      return `${id} done`;
    });

    const results = await Promise.all(["a", "b", "c"].map(process));

    expect(results).toEqual(["a done", "b done", "c done"]);
    expect(order).toEqual(["a", "b", "c"]);
  });
});

describe("Caching", () => {
  // Avoid redundant computation or I/O.

  it("memoization — cache results by arguments", () => {
    const memoize = () => {
      const cache = new Map<string, unknown>();
      return decorator((fn, ...args: unknown[]) => {
        const key = JSON.stringify(args);
        if (cache.has(key)) return cache.get(key);
        const result = fn(...args);
        cache.set(key, result);
        return result;
      });
    };

    let computeCount = 0;
    const expensive = memoize()((n: number) => {
      computeCount++;
      return n * n;
    });

    expect(expensive(5)).toBe(25);
    expect(expensive(5)).toBe(25);
    expect(expensive(3)).toBe(9);
    expect(computeCount).toBe(2); // only computed twice (5 and 3)
  });

  it("memoization — recursive fibonacci", () => {
    const memoize = () => {
      const cache = new Map<string, unknown>();
      return decorator((fn, ...args: unknown[]) => {
        const key = JSON.stringify(args);
        if (cache.has(key)) return cache.get(key);
        const result = fn(...args);
        cache.set(key, result);
        return result;
      });
    };

    const fibonacci = memoize()((n: number): number => {
      if (n <= 1) return n;
      return fibonacci(n - 1) + fibonacci(n - 2);
    });

    expect(fibonacci(0)).toBe(0);
    expect(fibonacci(1)).toBe(1);
    expect(fibonacci(10)).toBe(55);
    expect(fibonacci(50)).toBe(12586269025);
  });

  it("TTL cache — expire results after a duration", async () => {
    const withTTLCache = (ttlMs: number) => {
      const cache = new Map<string, { value: unknown; expires: number }>();
      return asyncDecorator(async (fn, ...args: unknown[]) => {
        const key = JSON.stringify(args);
        const cached = cache.get(key);
        if (cached && Date.now() < cached.expires) {
          return cached.value;
        }
        const result = await fn(...args);
        cache.set(key, { value: result, expires: Date.now() + ttlMs });
        return result;
      });
    };

    let fetchCount = 0;
    const fetchUser = withTTLCache(50)(async (id: number) => {
      fetchCount++;
      return await Promise.resolve({ id, name: `User ${String(id)}` });
    });

    expect(await fetchUser(1)).toEqual({ id: 1, name: "User 1" });
    expect(await fetchUser(1)).toEqual({ id: 1, name: "User 1" });
    expect(fetchCount).toBe(1); // served from cache

    // Wait for TTL to expire
    await new Promise((r) => setTimeout(r, 60));
    expect(await fetchUser(1)).toEqual({ id: 1, name: "User 1" });
    expect(fetchCount).toBe(2); // cache expired, re-fetched
  });
});

// =============================================================================
// MOTIVATION — Composability
// =============================================================================

describe("Composability", () => {
  // All decorators are regular functions — compose by stacking.
  // The outermost decorator runs first.

  it("stack: logging → retry → timeout → target", async () => {
    const events: string[] = [];

    const withLogging = (name: string) =>
      asyncProbe((...args: unknown[]) => {
        events.push(`[${name}] \u2192 ${JSON.stringify(args)}`);
        return Promise.resolve((result: { ok: boolean; value?: unknown; error?: unknown }) => {
          if (result.ok) events.push(`[${name}] \u2190 ${JSON.stringify(result.value)}`);
          else events.push(`[${name}] \u2717 ${(result.error as Error).message}`);
          return Promise.resolve();
        });
      });

    const withRetry = (attempts: number) =>
      asyncDecorator(async (fn, ...args: unknown[]) => {
        let lastError: unknown;
        for (let i = 1; i <= attempts; i++) {
          try {
            return await fn(...args);
          } catch (e) {
            lastError = e;
          }
        }
        throw lastError;
      });

    const withTimeout = (ms: number) =>
      asyncDecorator(async (fn, ...args: unknown[]) => {
        return await Promise.race([
          fn(...args),
          new Promise<never>((_, reject) =>
            setTimeout(() => {
              reject(new Error("Timeout"));
            }, ms),
          ),
        ]);
      });

    let callCount = 0;
    const fetchUser = withLogging("fetchUser")(
      withRetry(3)(
        withTimeout(100)(async (id: number) => {
          callCount++;
          if (callCount < 2) throw new Error("transient");
          return await Promise.resolve({ id, name: "Alice" });
        }),
      ),
    );

    const result = await fetchUser(42);
    expect(result).toEqual({ id: 42, name: "Alice" });
    expect(events[0]).toBe("[fetchUser] → [42]");
    expect(events[events.length - 1]).toBe('[fetchUser] ← {"id":42,"name":"Alice"}');
  });

  it("compose guards with observability", () => {
    const events: string[] = [];

    const withLogging = (name: string) =>
      probe((...args: unknown[]) => {
        events.push(`[${name}] called: ${JSON.stringify(args)}`);
        return (result) => {
          if (result.ok) events.push(`[${name}] ok`);
          else events.push(`[${name}] error: ${(result.error as Error).message}`);
        };
      });

    const validatePositive = decorator((fn, n: number) => {
      if (n < 0) throw new RangeError("Must be positive");
      return fn(n);
    });

    // Logging (outer) observes guard (inner) behavior
    const sqrt = withLogging("sqrt")(validatePositive(Math.sqrt));

    expect(sqrt(16)).toBe(4);
    expect(events).toEqual(["[sqrt] called: [16]", "[sqrt] ok"]);

    events.length = 0;
    expect(() => sqrt(-1)).toThrow("Must be positive");
    expect(events).toEqual(["[sqrt] called: [-1]", "[sqrt] error: Must be positive"]);
  });
});

// =============================================================================
// API Reference — decorate, transform, decorator, middleware, attempt, probe
// =============================================================================

describe("API Reference — decorate", () => {
  it("basic decoration — log and forward", () => {
    const logs: string[] = [];

    function greet(name: string) {
      return `Hello, ${name}!`;
    }

    const loggedGreet = decorate(greet, (fn, name) => {
      logs.push(`greet called with "${name}"`);
      const result = fn(name);
      logs.push(`greet returned "${result}"`);
      return result;
    });

    expect(loggedGreet("Alice")).toBe("Hello, Alice!");
    expect(logs).toEqual(['greet called with "Alice"', 'greet returned "Hello, Alice!"']);
  });
});

describe("API Reference — transform", () => {
  it("change argument types", () => {
    const add = (a: number, b: number) => a + b;

    const addStrings = transform(add, (fn, a: string, b: string) => {
      return fn(Number(a), Number(b)).toString();
    });

    expect(addStrings("2", "3")).toBe("5");
  });
});

describe("API Reference — decorator", () => {
  it("reusable logging decorator", () => {
    const logs: string[] = [];

    const withLogging = decorator((fn, ...args: unknown[]) => {
      logs.push(`called with: ${JSON.stringify(args)}`);
      const result = fn(...args);
      logs.push(`returned: ${JSON.stringify(result)}`);
      return result;
    });

    const add = withLogging((a: number, b: number) => a + b);
    const mul = withLogging((a: number, b: number) => a * b);

    expect(add(2, 3)).toBe(5);
    expect(mul(4, 5)).toBe(20);
    expect(logs).toEqual(["called with: [2,3]", "returned: 5", "called with: [4,5]", "returned: 20"]);
  });
});

describe("API Reference — middleware", () => {
  it("guard via middleware pattern", () => {
    let enabled = true;

    const withGuard = (condition: () => boolean) =>
      middleware((next) => {
        if (!condition()) throw new Error("Guard failed");
        next();
      });

    const action = withGuard(() => enabled)((x: number) => x * 2);

    expect(action(5)).toBe(10);

    enabled = false;
    expect(() => action(5)).toThrow("Guard failed");
  });
});

describe("API Reference — attempt", () => {
  it("wraps JSON.parse into Result<T>", () => {
    const safeParse = attempt(JSON.parse);

    const success = safeParse('{"a":1}');
    expect(success).toEqual({ ok: true, value: { a: 1 } });

    const failure = safeParse("not json");
    expect(failure.ok).toBe(false);
    expect((failure as { ok: false; error: unknown }).error).toBeInstanceOf(SyntaxError);
  });
});

describe("API Reference — probe", () => {
  it("observes without interfering", () => {
    const observations: { args: unknown[]; result?: unknown }[] = [];

    const trace = probe((...args: unknown[]) => {
      const entry: { args: unknown[]; result?: unknown } = { args };
      observations.push(entry);
      return (result) => {
        entry.result = result;
      };
    });

    const double = trace((x: number) => x * 2);

    expect(double(5)).toBe(10);
    expect(double(7)).toBe(14);
    expect(observations).toEqual([
      { args: [5], result: { ok: true, value: 10 } },
      { args: [7], result: { ok: true, value: 14 } },
    ]);
  });
});

describe("API Reference — scheduler / continuation", () => {
  it("FIFO sequential execution", async () => {
    const next = continuation();
    const sequential = scheduler(next);

    const order: string[] = [];
    const process = sequential(async (id: string) => {
      await new Promise((r) => setTimeout(r, Math.random() * 10));
      order.push(id);
      return `${id} done`;
    });

    const results = await Promise.all(["x", "y", "z"].map(process));

    expect(results).toEqual(["x done", "y done", "z done"]);
    expect(order).toEqual(["x", "y", "z"]);
  });
});
