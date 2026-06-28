---
title: "@thuum/decor"
description: Type-safe function decorator toolkit for aspect-oriented programming — build reusable, composable patterns for observability, resilience, and flow control in TypeScript.
---

## Installation

```bash
npm install @thuum/decor
# or
bun add @thuum/decor
```

## Overview

`@thuum/decor` provides higher-order functions that wrap existing functions with cross-cutting concerns — without modifying the original implementation. It ships the building blocks; users build the patterns.

### Decorator Functions

One-shot functions that decorate a specific target function, returning a new version:

- **`decorate(fn, wrapper)`** — Decorates a single function with a wrapper, preserving its signature
- **`transform(fn, transformer)`** — Transforms a function into a new one with a potentially different signature

### Decorator Factories

Produce reusable decorators that can be applied to many compatible functions:

- **`attempt`** — Wraps a function in try-catch, returning a `Result<T>` instead of throwing
- **`decorator(wrapper)`** — Creates a reusable, type-safe function decorator with full interception power
- **`middleware(mw)`** — Creates a decorator using a middleware pattern with a `next()` callback
- **`probe(probeFn)`** — Creates a decorator for tracing function execution (arguments and results)

The async variants (available at `@thuum/decor/async`) include all factories above plus:

- **`scheduler(next)`** — Creates a decorator that routes every invocation through a scheduling strategy
- **`continuation(seed?)`** — Creates a sequential FIFO scheduler for serializing async execution

### Features

- 🔍 **Observability** — Trace, log, and measure function calls without modifying behavior
- 🛡️ **Precondition Guards** — Prevent execution when contracts are unmet
- 🔄 **Lifecycle Hooks** — Trigger setup or teardown around execution
- 💪 **Resilience** — Retry, timeout, circuit-break, and fallback on failure
- ⚡ **Flow Control** — Throttle, debounce, serialize, and limit concurrency
- 📦 **Caching** — Memoize and replay results to avoid redundant work
- 🧩 **Composability** — Stack decorators declaratively, type-safe and zero-dependency

---

## Motivation

The patterns below appear in virtually every production codebase. `@thuum/decor` provides primitives that make building them trivial — without coupling your business logic to cross-cutting infrastructure.

### Core Use Cases

These are the primary reasons `@thuum/decor` exists.

#### Observability

*See what happens without changing what happens.*

Emit structured telemetry around invocation. May wrap in try/catch with rethrow. Never alters behavior or return values.

```typescript
import { probe } from "@thuum/decor";

// Structured logging — observe arguments and results
const withLogging = (name: string) =>
  probe((...args: unknown[]) => {
    console.log(`[${name}] called with:`, args);
    return (result) => {
      if (result.ok) {
        console.log(`[${name}] returned:`, result.value);
      } else {
        console.error(`[${name}] threw:`, result.error);
      }
    };
  });

const add = withLogging("add")((a: number, b: number) => a + b);
add(2, 3);
// [add] called with: [2, 3]
// [add] returned: 5
```

```typescript
import { middleware } from "@thuum/decor";

// Execution timing — measure duration without altering flow
const withTiming = (label: string) =>
  middleware((next) => {
    const start = performance.now();
    next();
    const elapsed = performance.now() - start;
    console.log(`[${label}] ${elapsed.toFixed(2)}ms`);
  });

const compute = withTiming("compute")((x: number) => x * x);
compute(42); // [compute] 0.01ms
```

```typescript
import { probe } from "@thuum/decor";

// Call counting — track invocation frequency
const withCounter = (name: string) => {
  let count = 0;
  return probe((..._args: unknown[]) => {
    count++;
    console.log(`[${name}] invocation #${count}`);
  });
};

const greet = withCounter("greet")((name: string) => `Hello, ${name}!`);
greet("Alice"); // [greet] invocation #1
greet("Bob");   // [greet] invocation #2
```

```typescript
import { probe } from "@thuum/decor";

// Tracing spans — emit span-like context for distributed tracing
const withTracing = (spanName: string) =>
  probe((...args: unknown[]) => {
    const traceId = crypto.randomUUID();
    console.log(`[trace:${traceId}] → ${spanName}`, args);
    return (result) => {
      if (result.ok) {
        console.log(`[trace:${traceId}] ← ${spanName} OK`);
      } else {
        console.log(`[trace:${traceId}] ← ${spanName} ERROR`, result.error);
      }
    };
  });
```

#### Precondition Guards

*Prevent execution when a contract is unmet.*

Short-circuit with a throw or early return. Guards protect invariants — they do not produce `Result<T>`.

```typescript
import { decorator } from "@thuum/decor";

// Disposed check — prevent use-after-dispose
const guardDisposed = (isDisposed: () => boolean) =>
  decorator((fn, ...args: unknown[]) => {
    if (isDisposed()) {
      throw new Error("Cannot invoke: resource is disposed");
    }
    return fn(...args);
  });

let disposed = false;
const send = guardDisposed(() => disposed)((msg: string) => {
  console.log("Sending:", msg);
});

send("hello"); // Sending: hello
disposed = true;
send("world"); // throws: Cannot invoke: resource is disposed
```

```typescript
import { middleware } from "@thuum/decor";

// Already-initialized / idempotency — execute only once
const once = middleware((next) => {
  let initialized = false;
  if (initialized) return;
  initialized = true;
  next();
});

const setup = once(() => {
  console.log("Initializing...");
});

setup(); // Initializing...
setup(); // (no-op)
```

```typescript
import { decorator } from "@thuum/decor";

// Input validation — reject invalid arguments
const validatePositive = decorator((fn, n: number) => {
  if (n < 0) throw new RangeError(`Expected positive number, got ${n}`);
  return fn(n);
});

const sqrt = validatePositive(Math.sqrt);
sqrt(16);  // 4
sqrt(-1);  // throws RangeError: Expected positive number, got -1
```

```typescript
import { decorator } from "@thuum/decor";

// Invariant assertion — fail fast on violated assumptions
const assertNonNull = <T>(label: string) =>
  decorator((fn, value: T | null | undefined) => {
    if (value == null) {
      throw new TypeError(`Invariant violation: ${label} must not be null`);
    }
    return fn(value);
  });

const processUser = assertNonNull<{ name: string }>("user")((user) => {
  return user.name.toUpperCase();
});

processUser({ name: "Alice" }); // "ALICE"
processUser(null);              // throws TypeError
```

#### Resilience

*Control failure modes declaratively.*

Protect against transient and systemic failures. Includes the Result pattern (`attempt`), retry, timeout, and circuit breaker strategies.

```typescript
import { attempt } from "@thuum/decor";

// Result pattern — convert throws into values
const divide = (a: number, b: number) => {
  if (b === 0) throw new Error("Divide by zero");
  return a / b;
};

const safeDivide = attempt(divide);
const result = safeDivide(10, 0);

if (!result.ok) {
  console.error("Failed:", result.error); // Failed: Error: Divide by zero
} else {
  console.log("Result:", result.value);
}
```

```typescript
import { decorator } from "@thuum/decor/async";

// Retry with exponential backoff — rethrows on exhaustion
const withRetry = (maxAttempts: number, baseDelayMs: number) =>
  decorator(async (fn, ...args: unknown[]) => {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          const delay = baseDelayMs * Math.pow(2, attempt - 1);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
    throw lastError;
  });

const fetchUser = withRetry(3, 500)(async (id: number) => {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
});

await fetchUser(1); // retries up to 3 times with 500ms, 1000ms, 2000ms delays
```

```typescript
import { decorator } from "@thuum/decor/async";

// Timeout — reject after deadline
const withTimeout = (ms: number) =>
  decorator(async (fn, ...args: unknown[]) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ms);
    try {
      return await fn(...args);
    } finally {
      clearTimeout(timeout);
    }
  });

const fetchData = withTimeout(5000)(async (url: string) => {
  const res = await fetch(url);
  return res.json();
});
```

```typescript
import { decorator } from "@thuum/decor/async";

// Circuit breaker — fast-fail after threshold
const withCircuitBreaker = (threshold: number, cooldownMs: number) => {
  let failures = 0;
  let openUntil = 0;

  return decorator(async (fn, ...args: unknown[]) => {
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
```



---

### Recipes

High-value patterns that demonstrate `@thuum/decor`'s expressiveness.

#### Lifecycle Hooks

*Trigger setup or teardown around execution.*

```typescript
import { middleware } from "@thuum/decor/async";

// Ensure-initialized — lazily initialize a resource before first use
const ensureInitialized = (init: () => Promise<void>) => {
  let initialized = false;
  return middleware(async (next) => {
    if (!initialized) {
      await init();
      initialized = true;
    }
    await next();
  });
};

const withDb = ensureInitialized(async () => {
  console.log("Connecting to database...");
  await connectToDatabase();
});

const query = withDb(async (sql: string) => {
  return db.execute(sql);
});

await query("SELECT 1"); // Connecting to database... (first call only)
await query("SELECT 2"); // (already initialized)
```

```typescript
import { middleware } from "@thuum/decor";

// Before/after hooks — resource acquire/release
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
  () => console.log("BEGIN"),
  () => console.log("COMMIT"),
);

const save = withTransaction((data: string) => {
  console.log("Saving:", data);
});

save("record");
// BEGIN
// Saving: record
// COMMIT
```

#### Flow Control

*Govern when and how often execution happens.*

```typescript
import { decorator } from "@thuum/decor";

// Throttle — limit invocation rate (browser events)
const throttle = (limitMs: number) => {
  let lastCall = 0;
  return decorator((fn, ...args: unknown[]) => {
    const now = Date.now();
    if (now - lastCall < limitMs) return undefined as ReturnType<typeof fn>;
    lastCall = now;
    return fn(...args);
  });
};

const onScroll = throttle(100)((e: Event) => {
  console.log("Scroll event processed");
});
```

```typescript
import { decorator } from "@thuum/decor";

// Debounce — delay until activity settles (browser events)
const debounce = (waitMs: number) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return decorator((fn, ...args: unknown[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
    return undefined as ReturnType<typeof fn>;
  });
};

const onInput = debounce(300)((value: string) => {
  console.log("Search:", value);
});
```

```typescript
import { scheduler, continuation } from "@thuum/decor/async";

// Serialization (FIFO) — ensure sequential execution
const next = continuation();
const sequential = scheduler(next);

const process = sequential(async (id: string) => {
  await new Promise((r) => setTimeout(r, Math.random() * 50));
  return `${id} done`;
});

// Calls execute one-at-a-time, in FIFO order
const results = await Promise.all(["a", "b", "c"].map(process));
// ["a done", "b done", "c done"]
```

#### Caching

*Avoid redundant computation or I/O.*

```typescript
import { decorator } from "@thuum/decor";

// Memoization — cache results by arguments
const memoize = () => {
  const cache = new Map<string, unknown>();
  return decorator((fn, ...args: unknown[]) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key) as ReturnType<typeof fn>;
    const result = fn(...args);
    cache.set(key, result);
    return result;
  });
};

const fibonacci = memoize()((n: number): number => {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
});

fibonacci(50); // instant
```

```typescript
import { decorator } from "@thuum/decor/async";

// TTL cache — expire results after a duration
const withTTLCache = (ttlMs: number) => {
  const cache = new Map<string, { value: unknown; expires: number }>();
  return decorator(async (fn, ...args: unknown[]) => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    if (cached && Date.now() < cached.expires) {
      return cached.value as ReturnType<typeof fn>;
    }
    const result = await fn(...args);
    cache.set(key, { value: result, expires: Date.now() + ttlMs });
    return result;
  });
};

const fetchUser = withTTLCache(60_000)(async (id: number) => {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
});
```

---

### Composability

All decorators produced by `@thuum/decor` are regular functions — compose them by stacking. The outermost decorator runs first.

```typescript
import { decorator } from "@thuum/decor/async";
import { probe } from "@thuum/decor/async";

const withLogging = (name: string) =>
  probe((...args: unknown[]) => {
    console.log(`[${name}] →`, args);
    return (result) => {
      if (result.ok) console.log(`[${name}] ←`, result.value);
      else console.error(`[${name}] ✗`, result.error);
    };
  });

const withRetry = (attempts: number) =>
  decorator(async (fn, ...args: unknown[]) => {
    let lastError: unknown;
    for (let i = 1; i <= attempts; i++) {
      try { return await fn(...args); }
      catch (e) { lastError = e; }
    }
    throw lastError;
  });

const withTimeout = (ms: number) =>
  decorator(async (fn, ...args: unknown[]) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try { return await fn(...args); }
    finally { clearTimeout(t); }
  });

// Stack: logging (outermost) → retry → timeout → target
const fetchUser = withLogging("fetchUser")(
  withRetry(3)(
    withTimeout(5000)(async (id: number) => {
      const res = await fetch(`/api/users/${id}`);
      return res.json();
    })
  )
);

await fetchUser(42);
// [fetchUser] → [42]
// (retries with timeout on each attempt)
// [fetchUser] ← { id: 42, name: "Alice" }
```

---

## Choosing a Decorator

The package offers four functions with full or partial interception power — `decorate`, `decorator`, `middleware`, and `probe` — at different levels of reusability and control.

### Capability Comparison

| Capability | `decorate` | `decorator` | `middleware` | `probe` |
|---|:---:|:---:|:---:|:---:|
| **Read arguments** | ✅ receives `...args` | ✅ receives `...args` | ❌ only receives `next` | ✅ receives `...args` |
| **Modify arguments** | ✅ can pass different values to `fn()` | ✅ can pass different values to `fn()` | ❌ no access | ❌ target always called with original args |
| **Read return value** | ✅ captures `fn()` result | ✅ captures `fn()` result | ❌ no access | ✅ via `Result<T>` callback (read-only) |
| **Modify return value** | ✅ can return something else | ✅ can return something else | ❌ no access | ❌ original value always returned |
| **Prevent target execution** | ✅ simply don't call `fn()` | ✅ simply don't call `fn()` | ✅ simply don't call `next()` | ⚠️ only by throwing before |
| **Call target multiple times** | ✅ (e.g. retry) | ✅ (e.g. retry) | ✅ can call `next()` multiple times | ❌ always called exactly once |
| **Code before target** | ✅ | ✅ | ✅ | ✅ |
| **Code after target** | ✅ | ✅ | ✅ | ✅ via optional callback |
| **Observe errors** | ✅ with try/catch around `fn()` | ✅ with try/catch around `fn()` | ⚠️ indirectly (next throws) | ✅ via `Result { ok: false, error }` |
| **Preserve `this` binding** | ✅ auto-bound | ✅ auto-bound | ✅ auto-applied | ✅ auto-applied |
| **Composable (stackable)** | ⚠️ via nesting `decorate()` calls | ✅ | ✅ | ✅ |
| **Type-safe wrapper signature** | ✅ typed to target params | ✅ typed to target params | ✅ generic over any target | ✅ typed to probe params |
| **Reusable across functions** | ❌ one-shot, bound to specific `fn` | ✅ returns a reusable decorator | ✅ returns a reusable decorator | ✅ returns a reusable decorator |

### Design Intent

| | `decorate` | `decorator` | `middleware` | `probe` |
|---|---|---|---|---|
| **Mental model** | Ad-hoc wrapping — you decorate *one specific* function | Decorator factory — you create a *reusable* wrapper for many functions | Flow control gate — you decide *whether* to proceed | Passive observer — you *watch* the function |
| **Responsibility** | You call `fn()`, you handle the result | You call `fn()`, you handle the result | You call `next()` to proceed | The framework calls the target for you |
| **Power level** | 🔴 Maximum | 🔴 Maximum | 🟡 Medium | 🟢 Minimum |
| **Scope** | Single function | Any compatible function | Any function | Any compatible function |
| **Typical use cases** | One-off logging, argument clamping, ad-hoc memoization, quick inline wrapping | Reusable memoization, retry, argument validation/transformation, trampolines, access control | Feature flags, timing, before/after hooks, guards, conditional execution | Logging, tracing, metrics, auditing, assertions |

### When to Choose Which

- **`decorate`** — You want to wrap *one specific function* with full interception power. Ideal for ad-hoc, inline decoration where the wrapper logic is specific to that function and doesn't need to be reusable.
- **`probe`** — You just want to *observe* without interfering. The target always runs, you optionally inspect the outcome. Ideal for telemetry, logging, and lightweight precondition guards (that throw).
- **`middleware`** — You need to control *whether* the target runs and/or wrap it with before/after logic, but you don't need to touch the arguments or return value. Familiar Express/Koa pattern.
- **`decorator`** — You need full control *and* reusability: create a wrapper once and apply it to many functions. Transform inputs, transform outputs, call the target conditionally or repeatedly, or replace its behavior entirely.

---

## API Reference

### `decorate(fn, wrapper)`

Decorates a single target function with a wrapper, returning a new function with the same signature.

The wrapper receives:
1. `fn` — the original function (with `this` already bound)
2. `...args` — the arguments passed to the decorated function

It must return the same type as the original function.

```typescript
import { decorate } from "@thuum/decor";

function greet(name: string) {
  return `Hello, ${name}!`;
}

const loggedGreet = decorate(greet, (fn, name) => {
  console.log(`greet called with "${name}"`);
  const result = fn(name);
  console.log(`greet returned "${result}"`);
  return result;
});
```

### `transform(fn, transformer)`

Transforms a function into a new one with a potentially different signature (arguments and/or return type).

```typescript
import { transform } from "@thuum/decor";

const add = (a: number, b: number) => a + b;

const addStrings = transform(add, (fn, a: string, b: string) => {
  return fn(Number(a), Number(b)).toString();
});

addStrings("2", "3"); // "5"
```

### `decorator(wrapper)`

Creates a reusable, type-safe function decorator. The wrapper receives `fn` and `...args`, and must return the same type as the target.

```typescript
import { decorator } from "@thuum/decor";

const withLogging = decorator((fn, ...args: unknown[]) => {
  console.log("called with:", args);
  const result = fn(...args);
  console.log("returned:", result);
  return result;
});

const add = withLogging((a: number, b: number) => a + b);
add(2, 3); // logs arguments and result
```

### `middleware(mw)`

Creates a decorator using a middleware pattern. Call `next()` to execute the target; skip it to short-circuit.

```typescript
import { middleware } from "@thuum/decor";

const withGuard = (condition: () => boolean) =>
  middleware((next) => {
    if (!condition()) throw new Error("Guard failed");
    next();
  });
```

### `attempt(fn)`

Decorates a function so it returns a `Result<T>` instead of throwing.

```typescript
import { attempt } from "@thuum/decor";

const safeParse = attempt(JSON.parse);
const result = safeParse("not json");
// { ok: false, error: SyntaxError }
```

### `probe(probeFn)`

Creates a decorator that observes function execution without interfering. The `probeFn` receives call arguments and optionally returns a callback that receives the `Result<T>`.

```typescript
import { probe } from "@thuum/decor";

const trace = probe((...args: unknown[]) => {
  console.log("→", args);
  return (result) => {
    if (result.ok) console.log("←", result.value);
    else console.error("✗", result.error);
  };
});
```

### Async Variants

All factories have async versions at `@thuum/decor/async`:

```typescript
import { decorator, middleware, probe, attempt } from "@thuum/decor/async";
import { scheduler, continuation } from "@thuum/decor/async";
```

Async factories work identically to their sync counterparts but handle `Promise`-returning functions and `await` within wrappers.

### `scheduler(next)` / `continuation(seed?)`

Async-only. Creates a decorator that routes invocations through a scheduling strategy.

```typescript
import { scheduler, continuation } from "@thuum/decor/async";

const next = continuation();
const sequential = scheduler(next);

const process = sequential(async (id: string) => {
  await someAsyncWork(id);
  return `${id} done`;
});

// Executes one-at-a-time in FIFO order
await Promise.all(["a", "b", "c"].map(process));
```

### `Result<T>`

```typescript
type Result<T> =
  | { ok: true; value: T; error?: never }
  | { ok: false; value?: never; error: unknown };
```

A discriminated union representing either a successful computation or a failed one. Use `result.ok` to narrow the type.

---

## License

ISC
