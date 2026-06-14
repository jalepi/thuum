# @thuum/decor

Function decorators for error handling, observability, and cross-cutting concerns.

## Installation

```bash
npm install @thuum/decor
# or
bun add @thuum/decor
```

## Overview

`@thuum/decor` provides higher-order functions that wrap existing functions with cross-cutting concerns:

- **`decorate(wrapper)`** — Core primitive for creating type-safe, reusable function decorators
- **`attempt(fn)`** — Wraps a function in try-catch, returning a `Result<T>` instead of throwing
- **`probe(probeFn)`** — Creates a decorator for tracing function execution (arguments and results)

Both `attempt` and `probe` have async variants available at `@thuum/decor/async`.

## Features

- 🛡️ **Error Containment** — Convert throwing functions into safe result-returning functions
- 🔍 **Observability** — Trace function calls and results without modifying implementation
- 🧩 **Composable Decorators** — Build reusable wrappers for guards, retries, logging, and more
- ⚡ **Async Support** — Dedicated async variants for Promise-based functions
- 🎯 **Type Safe** — Full TypeScript inference preserved through decoration
- 🪶 **Zero Dependencies** — No external dependencies

## API

### `decorate(wrapper)`

The core primitive for creating reusable, type-safe function decorators. It takes a wrapper function that intercepts calls to the decorated function, allowing you to add behavior before, after, or around the original invocation.

The wrapper receives:
1. `fn` — the original function (with `this` already bound)
2. `...args` — the arguments passed to the decorated function

It must return the same type as the original function.

#### Basic Example

```typescript
import { decorate } from "@thuum/decor";

const withLogging = decorate((fn, ...args: unknown[]) => {
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
import { decorate } from "@thuum/decor";

// Guard that prevents division by zero
const safeDivision = decorate((fn, a: number, b: number) => {
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
import { decorate } from "@thuum/decor";

// Guard that clamps arguments to a valid range
const clampedInput = decorate((fn, value: number) => {
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
import { decorate } from "@thuum/decor";

const withLog = decorate((fn, ...args: unknown[]) => {
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
import { decorate } from "@thuum/decor";

const withRetry = (maxAttempts: number, delayMs: number) =>
  decorate((fn, ...args: unknown[]) => {
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
import { decorate } from "@thuum/decor";

// Trampoline marker
const BOUNCE = Symbol("bounce");
type Thunk<T> = { [BOUNCE]: true; args: unknown[] } | T;

const trampoline = decorate((fn, ...args: unknown[]) => {
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
import { decorate } from "@thuum/decor";

const memoize = decorate((fn, ...args: unknown[]) => {
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
import { decorate } from "@thuum/decor";

const requireAuth = (getUser: () => { role: string } | null) =>
  decorate((fn, ...args: unknown[]) => {
    const user = getUser();
    if (!user) {
      throw new Error("Unauthorized: no user session");
    }
    return fn(...args);
  });

const requireRole = (getUser: () => { role: string } | null, role: string) =>
  decorate((fn, ...args: unknown[]) => {
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

Decorators created with `decorate` are regular functions — compose them naturally by stacking.

```typescript
import { decorate } from "@thuum/decor";

const withLogging = decorate((fn, ...args: unknown[]) => {
  console.log("→", args);
  const result = fn(...args);
  console.log("←", result);
  return result;
});

const withTiming = decorate((fn, ...args: unknown[]) => {
  const start = performance.now();
  const result = fn(...args);
  console.log(`⏱ ${(performance.now() - start).toFixed(2)}ms`);
  return result;
});

const withValidation = decorate((fn, n: number) => {
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

### `attempt(fn)`

Decorates a function so it returns a `Result<T>` (`{ value }` or `{ error }`) instead of throwing.

#### Example

```typescript
import { attempt } from "@thuum/decor";

const divide = (a: number, b: number) => {
  if (b === 0) throw new Error("Divide by zero");
  return a / b;
};

const safeDivide = attempt(divide);

const result = safeDivide(10, 2);
if ("error" in result) {
  console.error("Failed:", result.error);
} else {
  console.log("Result:", result.value); // 5
}
```

---

### `probe(probeFn)`

Creates a decorator that observes function execution. The `probeFn` receives the call arguments and optionally returns a callback that receives the result.

#### Example

```typescript
import { probe } from "@thuum/decor";

const trace = probe((...args: unknown[]) => {
  console.log("Called with:", args);
  return (result) => {
    if ("error" in result) {
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

---
const tracedFn = trace((x: number) => x * 2);
tracedFn(5); // Logs: Called with: [5] → Returned: 10
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
      if ("error" in result) {
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

### Async Variants

Both `attempt` and `probe` have async versions that handle Promise-returning functions:

```typescript
import { attempt } from "@thuum/decor/async";

const fetchData = async (url: string) => {
  const res = await fetch(url);
  return res.json();
};

const safeFetch = attempt(fetchData);
const result = await safeFetch("/api/data");
```

---

### `Result<T>`

```typescript
type Result<T> = { value: T } | { error: unknown };
```

A discriminated union representing either a successful computation (`{ value: T }`) or a failed one (`{ error: unknown }`). Use the `"error" in result` check to narrow the type.

## License

ISC
