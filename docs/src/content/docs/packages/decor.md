---
title: "@thuum/decor"
description: Function decorators for error handling, observability, and cross-cutting concerns.
---

## Installation

```bash
npm install @thuum/decor
```

## Overview

`@thuum/decor` provides higher-order functions that wrap existing functions with cross-cutting concerns:

- **`decorate(fn, wrapper)`** — Decorates a single function with a wrapper, returning a new decorated version
- **`decorator(wrapper)`** — Creates a reusable, type-safe function decorator applicable to many functions
- **`attempt(fn)`** — Wraps a function in try-catch, returning a `Result<T>` instead of throwing
- **`probe(probeFn)`** — Creates a decorator for tracing function execution (arguments and results)
- **`middleware(mw)`** — Creates a decorator using a middleware pattern with a `next()` callback for controlling execution flow

All five have async variants available at `@thuum/decor/async`.

## Choosing a Decorator

The package offers four functions with full or partial interception power — `decorate`, `decorator`, `middleware`, and `probe` — at different levels of reusability and control. Use this table to decide which one fits your use case.

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

## API

### `decorate(fn, wrapper)`

Decorates a single target function with a wrapper, returning a new function with the same signature. Unlike `decorator`, which creates a reusable decorator applicable to many functions, `decorate` is a one-shot decoration of a specific function.

The wrapper receives:
1. `fn` — the original function (with `this` already bound)
2. `...args` — the arguments passed to the decorated function

It must return the same type as the original function.

#### Basic Example

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

#### Argument Clamping

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

#### Short-Circuiting

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

#### Retry

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

#### Memoization

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

#### `decorate` vs `decorator`

Both offer full interception power. The difference is scope:

```typescript
import { decorate, decorator } from "@thuum/decor";

// decorate — one-shot, specific to `add`
const add = (a: number, b: number) => a + b;
const loggedAdd = decorate(add, (fn, a, b) => {
  console.log("adding", a, b);
  return fn(a, b);
});

// decorator — reusable, apply to any function
const withLogging = decorator((fn, ...args: unknown[]) => {
  console.log("called with", args);
  return fn(...args);
});
const loggedAdd2 = withLogging(add);
const loggedMultiply = withLogging((a: number, b: number) => a * b);
```

---

### `decorator(wrapper)`

The core primitive for creating reusable, type-safe function decorators. It takes a wrapper function that intercepts calls to the decorated function, allowing you to add behavior before, after, or around the original invocation.

The wrapper receives:
1. `fn` — the original function (with `this` already bound)
2. `...args` — the arguments passed to the decorated function

It must return the same type as the original function.

#### Basic Example

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

#### Function Guards

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

#### Logging

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

#### Retrying

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

#### Tail Call Optimization (Trampoline)

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

#### Memoization

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

#### Access Control

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

#### Composing Multiple Decorators

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

### `middleware(mw)`

Creates a decorator using a middleware pattern. The middleware function receives a `next` callback — calling it executes the original function, skipping it short-circuits execution.

This pattern is familiar from Express/Koa-style middleware and is ideal for guards, timing, and conditional execution.

#### Basic Example

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

#### Guard / Feature Access

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

#### Before / After Hooks

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

#### Composing Middlewares

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

### `attempt(fn)`

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

### `probe(probeFn)`

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

### Advanced: Composing Probes

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

`decorate`, `decorator`, `attempt`, `probe`, and `middleware` all have async versions that handle Promise-returning functions:

```typescript
import { attempt } from "@thuum/decor/async";

const safeFetch = attempt(async (url: string) => {
  const res = await fetch(url);
  return res.json();
});

const result = await safeFetch("/api/data");
```

### Async `decorate`

The async `decorate` accepts both sync and async target functions — the result is always an async function returning `Promise<R>`:

```typescript
import { decorate } from "@thuum/decor/async";

async function fetchUser(id: string) {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
}

const fetchUserWithLogging = decorate(fetchUser, async (fn, id) => {
  console.log(`Fetching user ${id}…`);
  const user = await fn(id);
  console.log(`Fetched user ${id}:`, user);
  return user;
});

await fetchUserWithLogging("42");
// logs: Fetching user 42…
// logs: Fetched user 42: { … }
```

Sync functions can also be decorated — the result becomes async:

```typescript
import { decorate } from "@thuum/decor/async";

function add(a: number, b: number) {
  return a + b;
}

const asyncAdd = decorate(add, async (fn, a, b) => {
  return fn(a, b);
});

await asyncAdd(1, 2); // Promise<3>
```

### Async `decorator`

The async `decorator` works just like the sync version but wraps async functions and awaits the decorator:

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

## Result Type

```typescript
type Result<T> = { ok: true; value: T; error?: never } | { ok: false; value?: never; error: unknown };
```

A discriminated union representing either a successful computation (`{ ok: true, value: T }`) or a failed one (`{ ok: false, error: unknown }`). Use `result.ok` to narrow the type.
