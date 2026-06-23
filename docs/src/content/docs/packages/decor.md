---
title: "@thuum/decor"
description: Function decorators for error handling, observability, and cross-cutting concerns.
---

## Installation

```bash
npm install @thuum/decor
```

## Overview

`@thuum/decor` provides higher-order functions that wrap existing functions with cross-cutting concerns. They are organized in two categories:

### Decorator Functions

One-shot functions that decorate a specific target function, returning a new version:

- **`decorate(fn, wrapper)`** — Decorates a single function with a wrapper, preserving its signature
- **`transform(fn, transformer)`** — Transforms a function into a new one with a potentially different signature (args and/or return type)

### Decorator Factories

Produce reusable decorators that can be applied to many compatible functions:

- **`attempt`** — A decorator that wraps a function in try-catch, returning a `Result<T>` instead of throwing
- **`decorator(wrapper)`** — Creates a reusable, type-safe function decorator with full interception power
- **`middleware(mw)`** — Creates a decorator using a middleware pattern with a `next()` callback for controlling execution flow
- **`probe(probeFn)`** — Creates a decorator for tracing function execution (arguments and results)

The async variants (available at `@thuum/decor/async`) include all factories above plus:

- **`scheduler(next)`** — Creates a decorator that routes every invocation through a scheduling strategy
- **`continuation(seed?)`** — Creates a sequential FIFO scheduler for serializing async execution

## Choosing a Decorator Factory

The package offers five decorator factories — `attempt`, `decorator`, `middleware`, `probe`, and `scheduler` — at different levels of interception power and reusability. Use this table to decide which one fits your use case.

> **Note:** `decorate` and `transform` are not included here — they are one-shot decorator functions for inline use with a specific target, not reusable factories.

### Capability Comparison

| Capability | `attempt` | `decorator` | `middleware` | `probe` | `scheduler` |
|---|:---:|:---:|:---:|:---:|:---:|
| **Read arguments** | ❌ no access | ✅ receives `...args` | ❌ only receives `next` | ✅ receives `...args` | ❌ no access |
| **Modify arguments** | ❌ no access | ✅ can pass different values to `fn()` | ❌ no access | ❌ target always called with original args | ❌ no access |
| **Read return value** | ✅ wrapped in `Result<T>` | ✅ captures `fn()` result | ❌ no access | ✅ via `Result<T>` callback (read-only) | ❌ no access |
| **Modify return value** | ⚠️ always returns `Result<T>` | ✅ can return something else | ❌ no access | ❌ original value always returned | ❌ no access |
| **Prevent target execution** | ❌ always executes | ✅ simply don't call `fn()` | ✅ simply don't call `next()` | ⚠️ only by throwing before | ❌ always executes |
| **Call target multiple times** | ❌ always called exactly once | ✅ (e.g. retry) | ✅ can call `next()` multiple times | ❌ always called exactly once | ❌ always called exactly once |
| **Code before target** | ❌ | ✅ | ✅ | ✅ | ❌ |
| **Code after target** | ❌ | ✅ | ✅ | ✅ via optional callback | ❌ |
| **Observe errors** | ✅ captured in `Result` | ✅ with try/catch around `fn()` | ⚠️ indirectly (next throws) | ✅ via `Result { ok: false, error }` | ❌ |
| **Preserve `this` binding** | ✅ auto-applied | ✅ auto-bound | ✅ auto-applied | ✅ auto-applied | ✅ auto-applied |
| **Composable (stackable)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Type-safe wrapper signature** | ✅ preserves target signature | ✅ typed to target params | ✅ generic over any target | ✅ typed to probe params | ✅ generic over any target |

### Design Intent

| | `attempt` | `decorator` | `middleware` | `probe` | `scheduler` |
|---|---|---|---|---|---|
| **Mental model** | Safety net — converts throws into values | Decorator factory — you create a *reusable* wrapper for many functions | Flow control gate — you decide *whether* to proceed | Passive observer — you *watch* the function | Execution controller — you decide *when* to proceed |
| **Responsibility** | The framework catches errors for you | You call `fn()`, you handle the result | You call `next()` to proceed | The framework calls the target for you | The scheduler decides when to call the target |
| **Power level** | 🟢 Minimum | 🔴 Maximum | 🟡 Medium | 🟢 Minimum | 🟢 Minimum |
| **Scope** | Any function | Any compatible function | Any function | Any compatible function | Any function (async only) |
| **Typical use cases** | Safe error handling, Result-based APIs | Reusable memoization, retry, argument validation/transformation, trampolines, access control | Feature flags, timing, before/after hooks, guards, conditional execution | Logging, tracing, metrics, auditing, assertions | Sequential execution, rate limiting, debouncing, throttling, concurrency control |

### When to Choose Which

- **`attempt`** — You want to convert a throwing function into one that returns `Result<T>`. No custom logic needed — just safe error boundaries.
- **`decorator`** — You need full control *and* reusability: create a wrapper once and apply it to many functions. Transform inputs, transform outputs, call the target conditionally or repeatedly, or replace its behavior entirely.
- **`middleware`** — You need to control *whether* the target runs and/or wrap it with before/after logic, but you don't need to touch the arguments or return value. Familiar Express/Koa pattern.
- **`probe`** — You just want to *observe* without interfering. The target always runs, you optionally inspect the outcome. Ideal for telemetry, logging, and lightweight precondition guards (that throw).
- **`scheduler`** — You need to control *when* a function executes — serializing concurrent calls, throttling, debouncing, or enforcing ordering guarantees. The target always runs eventually, but execution is deferred to the scheduling strategy. Async-only.

> For one-shot, inline decoration of a specific function, use `decorate(fn, wrapper)` or `transform(fn, transformer)` directly instead of a factory.

---

## API

### Decorator Functions

#### `decorate(fn, wrapper)`

Decorates a single target function with a wrapper, returning a new function with the same signature. Unlike `decorator`, which creates a reusable decorator applicable to many functions, `decorate` is a one-shot decoration of a specific function.

The wrapper receives:
1. `fn` — the original function (with `this` already bound)
2. `...args` — the arguments passed to the decorated function

It must return the same type as the original function.

##### Basic Example

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

loggedGreet("Alice");
// logs: greet called with "Alice"
// logs: greet returned "Hello, Alice!"
```

##### Argument Clamping

```typescript
import { decorate } from "@thuum/decor";

function setVolume(level: number) {
  return level;
}

const safeSetVolume = decorate(setVolume, (fn, level) => {
  const clamped = Math.max(0, Math.min(100, level));
  return fn(clamped);
});

safeSetVolume(150); // => 100
safeSetVolume(-10); // => 0
```

##### Short-Circuiting

Return early without calling the original function.

```typescript
import { decorate } from "@thuum/decor";

function divide(a: number, b: number) {
  return a / b;
}

const safeDivide = decorate(divide, (fn, a, b) => {
  if (b === 0) return 0;
  return fn(a, b);
});

safeDivide(10, 0); // => 0 (fn is never called)
safeDivide(10, 2); // => 5
```

##### Retry

```typescript
import { decorate } from "@thuum/decor";

function unreliableFetch(url: string): string {
  if (Math.random() < 0.5) throw new Error("network error");
  return `data from ${url}`;
}

const resilientFetch = decorate(unreliableFetch, (fn, url) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return fn(url);
    } catch {
      if (attempt === 2) throw new Error("all retries failed");
    }
  }
  throw new Error("unreachable");
});

resilientFetch("https://example.com"); // retries up to 3 times
```

##### Memoization

```typescript
import { decorate } from "@thuum/decor";

function expensiveComputation(n: number) {
  console.log("computing...");
  return n * n;
}

const memoized = decorate(expensiveComputation, (() => {
  const cache = new Map<number, number>();
  return (fn: (n: number) => number, n: number) => {
    if (cache.has(n)) return cache.get(n)!;
    const result = fn(n);
    cache.set(n, result);
    return result;
  };
})());

memoized(5); // logs "computing...", returns 25
memoized(5); // returns 25 (cached, no log)
```

---

#### `transform(fn, transformer)`

Transforms a target function into a new function with a potentially different signature (arguments and/or return type). Unlike `decorate`, which preserves the original function's signature, `transform` allows you to change the argument types, return type, or both.

The transformer receives:
1. `fn` — the original function (with `this` already bound)
2. `...args` — the new arguments (may differ from the original signature)

It may return a different type than the original function.

##### Intercept and Observe

```typescript
import { transform } from "@thuum/decor";

const increment = (n: number) => n + 1;

const traced = transform(increment, (fn, ...args) => {
  const result = fn(...args);
  console.log(`increment(${args}) => ${result}`);
  return result;
});

traced(1); // logs: increment(1) => 2, returns 2
```

##### Change Argument Signature

Accept multiple values instead of one:

```typescript
import { transform } from "@thuum/decor";

const reverse = (s: string) => s.split("").reverse().join("");

const reverseAll = transform(reverse, (fn, ...values: string[]) => {
  return values.map((s) => fn(s)).join(" ");
});

reverseAll("hello", "world"); // => "olleh dlrow"
```

##### Change Return Type — Wrap in Result

```typescript
import { transform } from "@thuum/decor";

const parse = (input: string) => {
  const n = Number(input);
  if (Number.isNaN(n)) throw new Error(`Invalid number: ${input}`);
  return n;
};

const safeParse = transform(
  parse,
  (fn, ...args): Result<number> => {
    try {
      return { ok: true, value: fn(...args) };
    } catch (error) {
      return { ok: false, error };
    }
  },
);

safeParse("42");   // => { ok: true, value: 42 }
safeParse("nope"); // => { ok: false, error: Error(...) }
```

##### Convert Sync to Async

```typescript
import { transform } from "@thuum/decor";

const add = (a: number, b: number) => a + b;

const asyncAdd = transform(add, async (fn, a, b) => {
  return await Promise.resolve(fn(a, b));
});

await asyncAdd(2, 3); // => 5 (as a Promise)
```

##### Retry Logic

```typescript
import { transform } from "@thuum/decor";

const fetchData = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const resilientFetch = transform(fetchData, async (fn, ...args) => {
  try {
    return await fn(...args);
  } catch {
    await new Promise((r) => setTimeout(r, 100));
    return await fn(...args);
  }
});

await resilientFetch("/api/data"); // retries once on failure
```

---

### Decorator Factories

#### `decorator(wrapper)`

The core primitive for creating reusable, type-safe function decorators. It takes a wrapper function that intercepts calls to the decorated function, allowing you to add behavior before, after, or around the original invocation.

The wrapper receives:
1. `fn` — the original function (with `this` already bound)
2. `...args` — the arguments passed to the decorated function

It must return the same type as the original function.

##### Basic Example

```typescript
import { decorator } from "@thuum/decor";

const withLogging = decorator((fn, ...args: unknown[]) => {
  console.log("called with:", args);
  const result = fn(...args);
  console.log("returned:", result);
  return result;
});

const add = withLogging((a: number, b: number) => a + b);
add(2, 3);
// logs: called with: [2, 3]
// logs: returned: 5
```

##### Function Guards

Validate arguments before the function executes. Short-circuit with an error or default value when validation fails.

```typescript
import { decorator } from "@thuum/decor";

// Guard that prevents division by zero
const safeDivision = decorator((fn, a: number, b: number) => {
  if (b === 0) {
    throw new RangeError("Cannot divide by zero");
  }
  return fn(a, b);
});

const divide = safeDivision((a: number, b: number) => a / b);

divide(10, 2); // 5
divide(10, 0); // throws RangeError: Cannot divide by zero
```

```typescript
import { decorator } from "@thuum/decor";

// Guard that clamps arguments to a valid range
const clampedInput = decorator((fn, value: number) => {
  const clamped = Math.max(0, Math.min(255, value));
  return fn(clamped);
});

const setBrightness = clampedInput((value: number) => {
  console.log(`Setting brightness to ${value}`);
  return value;
});

setBrightness(300); // logs: Setting brightness to 255
setBrightness(-50); // logs: Setting brightness to 0
```

##### Logging

Decorate functions with structured logging for debugging and auditing.

```typescript
import { decorator } from "@thuum/decor";

const withLog = decorator((fn, ...args: unknown[]) => {
  const start = performance.now();
  try {
    const result = fn(...args);
    const duration = performance.now() - start;
    console.log(`[OK] ${fn.name}(${args.join(", ")}) → ${result} (${duration.toFixed(2)}ms)`);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[ERR] ${fn.name}(${args.join(", ")}) threw after ${duration.toFixed(2)}ms`, error);
    throw error;
  }
});

const fetchUser = withLog(function fetchUser(id: number) {
  if (id <= 0) throw new Error("Invalid ID");
  return { id, name: "Alice" };
});

fetchUser(1);  // [OK] fetchUser(1) → [object Object] (0.02ms)
fetchUser(-1); // [ERR] fetchUser(-1) threw after 0.01ms Error: Invalid ID
```

##### Retrying

Automatically retry a function on failure with configurable attempts and delay.

```typescript
import { decorator } from "@thuum/decor";

const withRetry = (maxAttempts: number, delayMs: number) =>
  decorator((fn, ...args: unknown[]) => {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return fn(...args);
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          console.warn(`Attempt ${attempt}/${maxAttempts} failed, retrying in ${delayMs}ms...`);
          const waitUntil = Date.now() + delayMs;
          while (Date.now() < waitUntil) { /* busy wait (sync) */ }
        }
      }
    }
    throw lastError;
  });

let callCount = 0;
const unstableOperation = withRetry(3, 100)(function fetchData() {
  callCount++;
  if (callCount < 3) throw new Error("Connection timeout");
  return { data: "success" };
});

unstableOperation(); // Succeeds on 3rd attempt → { data: "success" }
```

##### Tail Call Optimization (Trampoline)

Eliminate stack overflow in recursive functions by converting tail calls into an iterative loop.

```typescript
import { decorator } from "@thuum/decor";

// Trampoline marker
const BOUNCE = Symbol("bounce");
type Thunk<T> = { [BOUNCE]: true; args: unknown[] } | T;

const trampoline = decorator((fn, ...args: unknown[]) => {
  let result: Thunk<unknown> = fn(...args);
  while (result && typeof result === "object" && BOUNCE in result) {
    result = fn(...result.args);
  }
  return result;
});

// Helper to signal a tail call
const bounce = <T extends unknown[]>(...args: T) => ({ [BOUNCE]: true as const, args });

// Factorial with tail-call optimization — won't overflow the stack
const factorial = trampoline(function factorial(n: number, acc: number = 1): number {
  if (n <= 1) return acc;
  return bounce(n - 1, n * acc) as unknown as number;
});

factorial(100_000); // computes without stack overflow
```

##### Memoization

Cache function results based on their arguments.

```typescript
import { decorator } from "@thuum/decor";

const memoize = decorator((fn, ...args: unknown[]) => {
  const cache: Map<string, unknown> = (fn as any).__cache ??= new Map();
  const key = JSON.stringify(args);
  if (cache.has(key)) {
    return cache.get(key);
  }
  const result = fn(...args);
  cache.set(key, result);
  return result;
});

const fibonacci = memoize(function fib(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
});

fibonacci(50); // instant — without memoization this would take forever
```

##### Access Control

Conditionally allow or deny function execution based on runtime context.

```typescript
import { decorator } from "@thuum/decor";

const requireAuth = (getUser: () => { role: string } | null) =>
  decorator((fn, ...args: unknown[]) => {
    const user = getUser();
    if (!user) {
      throw new Error("Unauthorized: no user session");
    }
    return fn(...args);
  });

const requireRole = (getUser: () => { role: string } | null, role: string) =>
  decorator((fn, ...args: unknown[]) => {
    const user = getUser();
    if (user?.role !== role) {
      throw new Error(`Forbidden: requires role "${role}"`);
    }
    return fn(...args);
  });

let currentUser: { role: string } | null = { role: "viewer" };
const getUser = () => currentUser;

const deleteRecord = requireRole(getUser, "admin")((id: number) => {
  console.log(`Deleted record ${id}`);
});

deleteRecord(42); // throws Forbidden: requires role "admin"

currentUser = { role: "admin" };
deleteRecord(42); // logs: Deleted record 42
```

##### Composing Multiple Decorators

Decorators created with `decorator` are regular functions — compose them naturally by stacking.

```typescript
import { decorator } from "@thuum/decor";

const withLogging = decorator((fn, ...args: unknown[]) => {
  console.log("→", args);
  const result = fn(...args);
  console.log("←", result);
  return result;
});

const withTiming = decorator((fn, ...args: unknown[]) => {
  const start = performance.now();
  const result = fn(...args);
  console.log(`⏱ ${(performance.now() - start).toFixed(2)}ms`);
  return result;
});

const withValidation = decorator((fn, n: number) => {
  if (n < 0) throw new RangeError("Must be non-negative");
  return fn(n);
});

// Apply decorators bottom-up: validation runs first, then timing, then logging
const sqrt = withLogging(withTiming(withValidation(Math.sqrt)));

sqrt(16);
// → [16]
// ⏱ 0.01ms
// ← 4
```

---

#### `middleware(mw)`

Creates a decorator using a middleware pattern. The middleware function receives a `next` callback — calling it executes the original function, skipping it short-circuits execution.

This pattern is familiar from Express/Koa-style middleware and is ideal for guards, timing, and conditional execution.

##### Basic Example

```typescript
import { middleware } from "@thuum/decor";

const withTiming = middleware((next) => {
  const before = performance.now();
  next();
  const after = performance.now();
  console.log(`Took ${(after - before).toFixed(2)}ms`);
});

const compute = withTiming((x: number) => x * x);
compute(5); // logs: Took 0.01ms
```

##### Guard / Feature Access

```typescript
import { middleware } from "@thuum/decor";

const featureAccess = (feature: string) =>
  middleware((next) => {
    if (!isFeatureEnabled(feature)) {
      throw new Error(`Feature "${feature}" is not enabled`);
    }
    next();
  });

const protectedAction = featureAccess("beta-feature")((data: string) => {
  console.log("Processing:", data);
});

protectedAction("hello"); // throws if feature is disabled
```

##### Before / After Hooks

```typescript
import { middleware } from "@thuum/decor";

const withHooks = middleware((next) => {
  console.log("before");
  next();
  console.log("after");
});

const greet = withHooks((name: string) => {
  console.log(`Hello, ${name}!`);
});

greet("World");
// logs: before
// logs: Hello, World!
// logs: after
```

##### Composing Middlewares

Middleware decorators compose naturally by stacking, just like `decorator`:

```typescript
import { middleware } from "@thuum/decor";

const withAuth = middleware((next) => {
  if (!currentUser) throw new Error("Unauthorized");
  next();
});

const withTiming = middleware((next) => {
  const start = performance.now();
  next();
  console.log(`⏱ ${(performance.now() - start).toFixed(2)}ms`);
});

const action = withTiming(withAuth((id: number) => {
  return `Deleted ${id}`;
}));

action(42);
// Auth checked first, then timed
```

---

#### `attempt(fn)`

Decorates a function so it returns a `Result<T>` (`{ ok: true, value }` or `{ ok: false, error }`) instead of throwing.

```typescript
import { attempt } from "@thuum/decor";

const divide = (a: number, b: number) => {
  if (b === 0) throw new Error("Divide by zero");
  return a / b;
};

const safeDivide = attempt(divide);

const result = safeDivide(10, 2);
if (!result.ok) {
  console.error("Failed:", result.error);
} else {
  console.log("Result:", result.value); // 5
}
```

---

#### `probe(probeFn)`

Creates a decorator that observes function execution. The `probeFn` receives the call arguments and optionally returns a callback that receives the result.

```typescript
import { probe } from "@thuum/decor";

const trace = probe((...args: unknown[]) => {
  console.log("Called with:", args);
  return (result) => {
    if (!result.ok) {
      console.error("Failed:", result.error);
    } else {
      console.log("Returned:", result.value);
    }
  };
});

const double = trace((x: number) => x * 2);
double(5);
// logs: Called with: [5]
// logs: Returned: 10
```

#### Advanced: Composing Probes

Probes can be used as **logger factories** and **precondition guards**, then composed together:

```typescript
import { probe } from "@thuum/decor";

// A logger factory — creates a named probe that traces calls
const logger = (method: string) =>
  probe((...args: unknown[]) => {
    console.log(`${method} entered`, ...args);
    return (result) => {
      if (!result.ok) {
        console.log(`${method} threw`, result.error);
      } else {
        console.log(`${method} returned`, result.value);
      }
    };
  });

// A threshold guard — throws if input is below minimum
const threshold = (method: string, minimum: number) =>
  probe((x: number) => {
    if (x < minimum) {
      throw new Error(`${method} cannot be less than ${minimum}`);
    }
  });

// A business function we want to keep lean
const rate = (performance: number): "good" | "bad" =>
  performance > 7 ? "good" : "bad";

// Compose: logger (outer) wraps threshold (inner) wraps rate
const tracedRate = logger("rate")(threshold("rate", 0)(rate));

tracedRate(8);
// "rate entered 8"
// "rate returned good"

tracedRate(-1);
// "rate entered -1"
// "rate threw Error: rate cannot be less than 0"
```

Because the logger is the outermost decorator, it observes errors thrown by the threshold guard — keeping the business function completely unaware of cross-cutting concerns.

## Async Variants

`decorator`, `attempt`, `probe`, and `middleware` all have async versions that handle Promise-returning functions. Additionally, the async module provides `scheduler` and `continuation` for execution scheduling.

```typescript
import { attempt } from "@thuum/decor/async";

const safeFetch = attempt(async (url: string) => {
  const res = await fetch(url);
  return res.json();
});

const result = await safeFetch("/api/data");
```

### Async `decorator`

The async `decorator` works like the sync version but accepts both sync and async target functions — the result is always an async function returning `Promise<R>`:

```typescript
import { decorator } from "@thuum/decor/async";

const withRetry = (maxAttempts: number, delayMs: number) =>
  decorator(async (fn, ...args: unknown[]) => {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
    }
    throw lastError;
  });

const fetchUser = withRetry(3, 1000)(async (id: number) => {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
});

await fetchUser(1); // Retries up to 3 times on failure
```

Sync functions can also be decorated — the result becomes async:

```typescript
import { decorator } from "@thuum/decor/async";

const withLogging = decorator(async (fn, ...args: unknown[]) => {
  console.log("calling with", args);
  const result = await fn(...args);
  console.log("returned", result);
  return result;
});

function add(a: number, b: number) {
  return a + b;
}

const asyncAdd = withLogging(add);
await asyncAdd(1, 2); // Promise<3>
```

---

### Async `middleware`

The async `middleware` works with `async` functions and `await`s the `next()` callback:

```typescript
import { middleware } from "@thuum/decor/async";

const withTiming = middleware(async (next) => {
  const before = performance.now();
  await next();
  const after = performance.now();
  console.log(`Took ${(after - before).toFixed(2)}ms`);
});

const fetchData = withTiming(async (url: string) => {
  const res = await fetch(url);
  return res.json();
});

await fetchData("/api/data"); // logs timing after fetch completes
```

```typescript
import { middleware } from "@thuum/decor/async";

const featureAccess = (feature: string) =>
  middleware(async (next) => {
    const allowed = await checkFeatureFlag(feature);
    if (!allowed) {
      throw new Error(`Feature "${feature}" is not enabled`);
    }
    await next();
  });

const protectedAction = featureAccess("beta")(async (data: string) => {
  await saveData(data);
});

await protectedAction("hello"); // checks flag asynchronously first
```

---

### Async `probe`

The async `probe` receives arguments **as a tuple** (not spread), allowing the probe to mutate the arguments array before the target function sees them. It always returns a `Promise`.

```typescript
import { probe } from "@thuum/decor/async";

const trace = probe(async (args) => {
  console.log("called with:", args);
  return async ({ ok, error, value }) => {
    if (ok) {
      console.log("returned:", value);
    } else {
      console.log("threw:", error);
    }
  };
});

const add = trace(async (a: number, b: number) => a + b);
await add(2, 3);
// logs: called with: [2, 3]
// logs: returned: 5
```

#### Argument Mutation

Because the probe receives args as a mutable tuple, it can modify them before the target runs:

```typescript
import { probe } from "@thuum/decor/async";

const negate = probe(async (args: [a: number, b: number]) => {
  args[0] = -args[0];
  args[1] = -args[1];
});

const add = negate(async (a: number, b: number) => a + b);
await add(1, 2); // => -3 (args were negated before add ran)
```

#### Distributed Tracing

```typescript
import { probe } from "@thuum/decor/async";

const traced = (name: string) =>
  probe(async (args) => {
    const span = tracer.startSpan(name, { attributes: { args } });
    return async ({ ok, error }) => {
      if (!ok) span.recordException(error as Error);
      span.end();
    };
  });

const fetchOrder = traced("fetchOrder")(async (id: string) => {
  return await orderService.get(id);
});

await fetchOrder("order-123"); // span created and ended automatically
```

---

### `scheduler(next)` and `continuation(seed?)`

The `scheduler` creates a decorator that routes every invocation through a given scheduling strategy. Combined with `continuation`, this serializes concurrent calls into sequential execution.

#### `Scheduler` Type

A `Scheduler` is a function that accepts a zero-argument callable and returns a `Promise` that resolves when the scheduler decides to execute it:

```typescript
type Scheduler = <T>(callable: () => MaybePromise<T>) => Promise<T>;
```

#### `continuation(seed?)`

Creates a continuation-based scheduler that executes callables sequentially in FIFO order. Each callable waits for the previous one to settle before starting:

```typescript
import { continuation } from "@thuum/decor/async";

const next = continuation();

const results: number[] = [];

await Promise.all([
  next(() => { results.push(1); return 1; }),
  next(() => { results.push(2); return 2; }),
  next(() => { results.push(3); return 3; }),
]);

// results => [1, 2, 3] — always in order, regardless of timing
```

Failures are isolated — one rejection doesn't break the chain:

```typescript
import { continuation } from "@thuum/decor/async";

const next = continuation();

const p1 = next(() => "first");
const p2 = next(() => { throw new Error("oops"); });
const p3 = next(() => "third");

await p1;                    // => "first"
await p2.catch((e) => e);    // => Error("oops")
await p3;                    // => "third" — still runs
```

You can seed with a precondition to delay the entire chain:

```typescript
import { continuation } from "@thuum/decor/async";

const ready = fetch("/api/health").then(() => undefined);
const next = continuation(ready);

// These won't execute until the health check resolves
next(() => fetch("/api/data"));
next(() => fetch("/api/more-data"));
```

#### `scheduler(next)`

Creates a `Decorator` that schedules every invocation through the given `Scheduler`:

```typescript
import { scheduler, continuation } from "@thuum/decor/async";

const next = continuation();
const sequential = scheduler(next);

async function process(id: string): Promise<string> {
  return await new Promise((resolve) => {
    setTimeout(() => resolve(id + " done"), Math.random() * 25);
  });
}

// Calls execute one-at-a-time, in the order they were invoked
const scheduledProcess = sequential(process);

const results = await Promise.all(
  ["a", "b", "c", "d"].map((id) => scheduledProcess(id)),
);
// results => ["a done", "b done", "c done", "d done"] — always in order
```

#### Serializing Database Writes

```typescript
import { scheduler, continuation } from "@thuum/decor/async";

const next = continuation();
const serialize = scheduler(next);

async function saveRecord(record: { id: number; data: string }) {
  await db.insert(record);
  return record.id;
}

// Prevents concurrent inserts that could cause conflicts
const safeSave = serialize(saveRecord);

// These run sequentially even though they're fired concurrently
safeSave({ id: 1, data: "first" });
safeSave({ id: 2, data: "second" });
safeSave({ id: 3, data: "third" });
```

#### Custom Scheduler — Throttle

```typescript
import { scheduler } from "@thuum/decor/async";
import type { Scheduler } from "@thuum/decor/async";

const throttled: Scheduler = (() => {
  let last = Promise.resolve() as Promise<unknown>;
  return (callable) => {
    const next = last.then(
      () => new Promise((r) => setTimeout(r, 200)),
    ).then(callable);
    last = next.catch(() => {});
    return next;
  };
})();

const throttledScheduler = scheduler(throttled);

async function callApi(endpoint: string) {
  return await fetch(endpoint).then((r) => r.json());
}

// At least 200ms between each API call
const safeCallApi = throttledScheduler(callApi);
```

#### Shared Queue Across Functions

```typescript
import { scheduler, continuation } from "@thuum/decor/async";

const next = continuation();
const sequential = scheduler(next);

const readFile = sequential(async (path: string) => { /* ... */ });
const writeFile = sequential(async (path: string, data: string) => { /* ... */ });

// Both readFile and writeFile share the same queue,
// so reads and writes are fully serialized
await readFile("/tmp/data.txt");
await writeFile("/tmp/data.txt", "updated");
```

---

## Exported Types

The package exports the following types for use in type annotations:

```typescript
import { type Decorator, type Probe } from "@thuum/decor";
import { type Decorator, type Probe, type Scheduler } from "@thuum/decor/async";
```

| Type | Module | Description |
|---|---|---|
| `Decorator<Args, R>` | `@thuum/decor` | A reusable decorator that preserves function signatures |
| `Probe<Args, R>` | `@thuum/decor` | A probe decorator for observing function execution |
| `Decorator<Args, R>` | `@thuum/decor/async` | An async decorator that wraps functions returning `Promise` |
| `Probe<Args, R>` | `@thuum/decor/async` | An async probe decorator for observing async execution |
| `Scheduler` | `@thuum/decor/async` | A scheduling strategy for controlling execution timing |

---

## Result Type

```typescript
type Result<T> = { ok: true; value: T; error?: never } | { ok: false; value?: never; error: unknown };
```

A discriminated union representing either a successful computation (`{ ok: true, value: T }`) or a failed one (`{ ok: false, error: unknown }`). Use `result.ok` to narrow the type.
