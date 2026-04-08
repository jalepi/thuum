---
title: "@thuum/piper"
description: Functional programming utilities for pipe operations and function composition with async support.
---

## Installation

```bash
npm install @thuum/piper
```

## Overview

`@thuum/piper` provides utilities for functional programming with support for both synchronous and asynchronous operations:

- **`pipe(value)`** — Transform a value through a chain of synchronous functions
- **`build<T>()`** — Compose synchronous functions into a reusable transformation pipeline
- **`asyncPipe(value)`** — Transform values through chains that support both sync and async functions
- **`asyncBuild<T>()`** — Compose functions (sync or async) into a reusable async pipeline

## Synchronous API

### `pipe(value)`

Creates a pipe that transforms a value through a sequence of functions.

```typescript
import { pipe } from "@thuum/piper";

const { value } = pipe(1)
  .pipe((x) => x + 1) // 2
  .pipe((x) => x * 2) // 4
  .pipe((x) => `Result: ${x}`); // "Result: 4"

console.log(value); // "Result: 4"
```

### `build<T>()`

Creates a reusable function by composing a sequence of transformations.

```typescript
import { build } from "@thuum/piper";

const { fn: processNumber } = build<number>()
  .pipe((x) => x + 1)
  .pipe((x) => x * 2)
  .pipe((x) => `Result: ${x}`);

console.log(processNumber(1)); // "Result: 4"
console.log(processNumber(5)); // "Result: 12"
```

## Async API

The async variants support both synchronous and asynchronous functions in the same pipeline using `MaybePromise<T>`.

### `asyncPipe(value)`

```typescript
import { asyncPipe } from "@thuum/piper";

const { value } = asyncPipe(1)
  .pipe((x) => x + 1) // sync
  .pipe(async (x) => x * 2) // async
  .pipe((x) => x.toString()); // sync

const result = await value; // "4"
```

### `asyncBuild<T>()`

```typescript
import { asyncBuild } from "@thuum/piper";

const { fn: fetchUser } = asyncBuild<number>()
  .pipe(async (id) => fetch(`/api/users/${id}`))
  .pipe(async (res) => res.json())
  .pipe((data) => data.name.toUpperCase());

const name = await fetchUser(123);
```
