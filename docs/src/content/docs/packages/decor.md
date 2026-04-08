---
title: "@thuum/decor"
description: Function decorators for error handling and observability.
---

## Installation

```bash
npm install @thuum/decor
```

## Overview

`@thuum/decor` provides higher-order functions that wrap existing functions with cross-cutting concerns:

- **`attempt(fn)`** — Wraps a function in try-catch, returning a `Result<T>` instead of throwing
- **`probe(probeFn)`** — Creates a decorator for tracing function execution

Both have async variants for Promise-based functions.

## API

### `attempt(fn)`

Decorates a function so it returns `{ value }` or `{ error }` instead of throwing.

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

### `probe(probeFn)`

Creates a decorator that observes function execution. The `probeFn` receives the call arguments and returns a callback that receives the result.

```typescript
import { probe } from "@thuum/decor";

const trace = probe(({ args }) => {
  console.log("Called with:", args);
  return (result) => {
    if ("error" in result) {
      console.error("Failed:", result.error);
    } else {
      console.log("Returned:", result.value);
    }
  };
});

const context = { name: "logger" };
const tracedFn = trace(context, (x: number) => x * 2);
tracedFn(5); // Logs: Called with: [5] → Returned: 10
```

## Async Variants

Both decorators have async versions that handle Promise-returning functions:

```typescript
import { attempt } from "@thuum/decor/async";

const safeFetch = attempt(async (url: string) => {
  const res = await fetch(url);
  return res.json();
});

const result = await safeFetch("/api/data");
```

## Result Type

```typescript
type Result<T> = { value: T } | { error: unknown };
```
