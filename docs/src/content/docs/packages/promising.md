---
title: "@thuum/promising"
description: Async context management and Promise utilities.
---

## Installation

```bash
npm install @thuum/promising
```

## Overview

`@thuum/promising` provides modern async patterns for JavaScript/TypeScript:

- **`withResolvers<T>()`** — Create a promise with externally accessible resolve/reject functions
- **`createContext(options)`** — Sequential async execution context with lifecycle monitoring

## API

### `withResolvers<T>()`

Creates a promise along with its `resolve` and `reject` functions, making it easier to work with promises in scenarios where you need external control over resolution.

Based on the [`Promise.withResolvers()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers) proposal.

```typescript
import { withResolvers } from "@thuum/promising";

const { promise, resolve } = withResolvers<number>();
setTimeout(() => resolve(42), 100);
const value = await promise; // 42
```

#### Use Cases

- Event-based patterns where resolution happens in a different scope
- Testing async flows with controlled timing
- Bridging callback-based APIs to promises

### `createContext(options)`

Creates an async execution context that ensures tasks run sequentially in the order they were enqueued, regardless of when they actually complete.

#### Parameters

- `options.watch?` — Optional callback to monitor task lifecycle events (`waiting`, `pending`, `resolved`, `rejected`)

```typescript
import { createContext, withResolvers } from "@thuum/promising";

const ctx = createContext({
  watch(event) {
    console.log(`[${event.type}] ${event.name} (queue: ${event.size})`);
  },
});

// Tasks execute in order, even if resolved out of order
const r1 = withResolvers<number>();
const r2 = withResolvers<number>();

const p1 = ctx.run("first", () => r1.promise);
const p2 = ctx.run("second", () => r2.promise);

r2.resolve(2); // resolves second first...
r1.resolve(1); // ...but "first" still runs before "second"

await p1; // 1
await p2; // 2
```

#### AsyncContextEvent

```typescript
type AsyncContextEvent = {
  type: "waiting" | "pending" | "resolved" | "rejected";
  name: string;
  size: number;
  taskId: number;
};
```
