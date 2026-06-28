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
- **`pipe(value)`** *(from `@thuum/piper/async`)* — Transform values through chains that support both sync and async functions
- **`build<T>()`** *(from `@thuum/piper/async`)* — Compose functions (sync or async) into a reusable async pipeline

Sync and async utilities share the same API shape but are imported from different subpaths:

```typescript
import { pipe, build } from "@thuum/piper";       // sync
import { pipe, build } from "@thuum/piper/async"; // async
```

## Synchronous API

### `pipe(value)`

Transforms a value through a chain of functions, evaluated left to right. Use `pipe` when you want to apply a sequence of transformations to a single value without nesting function calls. Each `.pipe(fn)` step receives the output of the previous step and full type inference is preserved throughout.

#### Basic arithmetic

```typescript
import { pipe } from "@thuum/piper";

const { value } = pipe(1)
  .pipe((x) => x + 1)
  .pipe((x) => x * 2);

console.log(value); // 4
```

#### Parsing and normalizing user input

```typescript
import { pipe } from "@thuum/piper";

const { value: slug } = pipe("  Hello World!  ")
  .pipe((s) => s.trim())
  .pipe((s) => s.toLowerCase())
  .pipe((s) => s.replace(/\s+/g, "-"))
  .pipe((s) => s.replace(/[^a-z0-9-]/g, ""));

console.log(slug); // "hello-world"
```

#### Reshaping an object through multiple steps

```typescript
import { pipe } from "@thuum/piper";

const { value: greeting } = pipe({ first: "Jane", last: "Doe", age: 28 })
  .pipe((user) => ({ ...user, fullName: `${user.first} ${user.last}` }))
  .pipe((user) => `Hi ${user.fullName}, you are ${user.age} years old.`);

console.log(greeting); // "Hi Jane Doe, you are 28 years old."
```

### `build<T>()`

Composes a sequence of functions into a single reusable function. Unlike `pipe` which transforms a concrete value immediately, `build` creates a reusable pipeline that can be applied to many inputs.

#### Basic composition

```typescript
import { build } from "@thuum/piper";

const { fn } = build<number>()
  .pipe((x) => x + 1)
  .pipe((x) => x * 2);

console.log(fn(1)); // 4
console.log(fn(2)); // 6
```

#### Building a URL slug generator

```typescript
import { build } from "@thuum/piper";

const { fn: toSlug } = build<string>()
  .pipe((s) => s.trim())
  .pipe((s) => s.toLowerCase())
  .pipe((s) => s.replace(/\s+/g, "-"))
  .pipe((s) => s.replace(/[^a-z0-9-]/g, ""));

console.log(toSlug("  Blog Post Title! ")); // "blog-post-title"
console.log(toSlug("Another One  ")); // "another-one"
```

#### Domain-specific formatter

```typescript
import { build } from "@thuum/piper";

const { fn: formatPrice } = build<number>()
  .pipe((cents) => cents / 100)
  .pipe((dollars) => dollars.toFixed(2))
  .pipe((str) => `$${str}`);

console.log(formatPrice(1999)); // "$19.99"
console.log(formatPrice(50)); // "$0.50"
```

## Async API (`@thuum/piper/async`)

The async variants support both synchronous and asynchronous functions in the same pipeline using `MaybePromise<T>`. This allows you to seamlessly mix synchronous logic with async I/O (fetch, database queries, file reads, etc.) in a single readable pipeline.

### `pipe(value)`

Works like the synchronous `pipe`, but each step can return either a plain value or a `Promise`. The initial value can also be a `Promise`.

#### Fetching and transforming API data

```typescript
import { pipe } from "@thuum/piper/async";

const { value: userName } = pipe(fetch("/api/user/1"))
  .pipe((res) => res.json())
  .pipe((data) => data.name)
  .pipe((name) => name.toUpperCase());

const result = await userName; // "ALICE"
```

#### Mixing sync and async steps

```typescript
import { pipe } from "@thuum/piper/async";

const { value } = pipe(5)
  .pipe((x) => x * 2) // sync
  .pipe(async (x) => await lookupLabel(x)) // async I/O
  .pipe((label) => label.trim()); // sync

const result = await value;
```

#### Starting from an existing Promise

```typescript
import { pipe } from "@thuum/piper/async";

const { value } = pipe(Promise.resolve("raw input"))
  .pipe((s) => s.trim())
  .pipe(async (s) => await translate(s, "en", "fr"));

const result = await value;
```

#### Error propagation — rejected promises short-circuit the chain

```typescript
import { pipe } from "@thuum/piper/async";

const { value } = pipe(1)
  .pipe(() => Promise.reject(new Error("boom")))
  .pipe((x) => x + 1); // never called

await value; // throws Error("boom")
```

### `build<T>()`

Composes a sequence of sync and async functions into a single reusable async function. Ideal for constructing reusable workflows that involve I/O — HTTP requests, database queries, file operations — interleaved with synchronous transforms.

#### Composing an API client handler

```typescript
import { build } from "@thuum/piper/async";

const { fn: getUser } = build<number>()
  .pipe(async (id) => fetch(`/api/users/${id}`))
  .pipe((res) => res.json())
  .pipe((data) => ({ id: data.id, name: data.name }));

const user = await getUser(42);
console.log(user.name); // "Alice"
```

#### Reusable file processing pipeline

```typescript
import { build } from "@thuum/piper/async";

const { fn: processFile } = build<string>()
  .pipe(async (path) => await readFile(path, "utf-8"))
  .pipe((content) => content.split("\n"))
  .pipe((lines) => lines.filter((line) => line.trim() !== ""))
  .pipe((lines) => lines.length);

const count = await processFile("./data.txt");
console.log(count); // 150
```

#### Mixed sync/async with error short-circuiting

```typescript
import { build } from "@thuum/piper/async";

const { fn: safeDivide } = build<{ a: number; b: number }>()
  .pipe(({ a, b }) => {
    if (b === 0) throw new Error("Division by zero");
    return a / b;
  })
  .pipe(async (result) => await saveToAuditLog(result))
  .pipe((saved) => saved.id);

const id = await safeDivide({ a: 10, b: 2 });
```

## Type Signatures

### Sync

```typescript
type ValuePipe<T> = {
  pipe<R>(fn: (x: T) => R): ValuePipe<R>;
  readonly value: T;
};

function pipe<T>(value: T): ValuePipe<T>;

type FunctionPipe<X, Y> = {
  pipe<Z>(fn: (y: Y) => Z): FunctionPipe<X, Z>;
  fn: (x: X) => Y;
};

function build<X>(): FunctionPipe<X, X>;
```

### Async

```typescript
type MaybePromise<T> = T | Promise<T>;

type ValuePipe<T> = {
  pipe<R>(fn: (x: T) => MaybePromise<R>): ValuePipe<R>;
  readonly value: MaybePromise<T>;
};

function pipe<T>(value: MaybePromise<T>): ValuePipe<T>;

type FunctionPipe<X, Y> = {
  pipe<Z>(fn: (y: Y) => MaybePromise<Z>): FunctionPipe<X, Z>;
  fn: (x: X) => MaybePromise<Y>;
};

function build<X>(): FunctionPipe<X, X>;
```
