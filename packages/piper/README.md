# @thuum/piper

Functional programming utilities for pipe operations and function composition in TypeScript.

## Installation

```bash
npm install @thuum/piper
# or
bun add @thuum/piper
# or
yarn add @thuum/piper
```

## Overview

`@thuum/piper` provides utilities for functional programming with support for both synchronous and asynchronous operations:

- **`pipe(value)`** - Transform a value through a chain of synchronous functions
- **`build<T>()`** - Compose synchronous functions into a reusable transformation pipeline
- **`pipe(value)`** (async) - Transform values through chains that support both sync and async functions
- **`build<T>()`** (async) - Compose functions (sync or async) into a reusable async pipeline

Sync and async utilities share the same API shape but are imported from different subpaths:

```typescript
import { pipe, build } from "@thuum/piper";       // sync
import { pipe, build } from "@thuum/piper/async"; // async
```

All utilities provide full TypeScript type safety with automatic type inference.

## Features

- 🔗 **Fluent API** - Chain transformations with `.pipe()`
- 🔄 **Function Composition** - Build reusable transformation pipelines
- ⚡ **Flexible Async Support** - Mix synchronous and asynchronous functions seamlessly
- 🎯 **Type Safe** - Full TypeScript inference throughout the chain
- 🪶 **Lightweight** - Zero dependencies
- 📦 **Dual Package** - ESM and CommonJS support

## API

### `pipe(value)`

Creates a pipe that transforms a value through a sequence of synchronous functions.

#### Signature

```typescript
function pipe<T>(value: T): ValuePipe<T>;

interface ValuePipe<T> {
  pipe<R>(fn: (x: T) => R): ValuePipe<R>;
  readonly value: T;
}
```

#### Examples

##### Basic arithmetic

```typescript
import { pipe } from "@thuum/piper";

const { value } = pipe(1)
  .pipe((x) => x + 1)
  .pipe((x) => x * 2);

console.log(value); // 4
```

##### Parsing and normalizing user input

```typescript
import { pipe } from "@thuum/piper";

const { value: slug } = pipe("  Hello World!  ")
  .pipe((s) => s.trim())
  .pipe((s) => s.toLowerCase())
  .pipe((s) => s.replace(/\s+/g, "-"))
  .pipe((s) => s.replace(/[^a-z0-9-]/g, ""));

console.log(slug); // "hello-world"
```

##### Reshaping an object through multiple steps

```typescript
import { pipe } from "@thuum/piper";

const { value: greeting } = pipe({ first: "Jane", last: "Doe", age: 28 })
  .pipe((user) => ({ ...user, fullName: `${user.first} ${user.last}` }))
  .pipe((user) => `Hi ${user.fullName}, you are ${user.age} years old.`);

console.log(greeting); // "Hi Jane Doe, you are 28 years old."
```

#### Use Cases

- One-time value transformations
- Data processing pipelines
- Complex calculations with intermediate steps
- Avoiding nested function calls

### `build<T>()`

Creates a reusable function by composing a sequence of synchronous transformations.

#### Signature

```typescript
function build<X>(): FunctionPipe<X, X>;

interface FunctionPipe<X, Y> {
  pipe<Z>(fn: (y: Y) => Z): FunctionPipe<X, Z>;
  fn: (x: X) => Y;
}
```

#### Examples

##### Basic composition

```typescript
import { build } from "@thuum/piper";

const { fn } = build<number>()
  .pipe((x) => x + 1)
  .pipe((x) => x * 2);

console.log(fn(1)); // 4
console.log(fn(2)); // 6
```

##### Building a URL slug generator

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

##### Domain-specific formatter

```typescript
import { build } from "@thuum/piper";

const { fn: formatPrice } = build<number>()
  .pipe((cents) => cents / 100)
  .pipe((dollars) => dollars.toFixed(2))
  .pipe((str) => `$${str}`);

console.log(formatPrice(1999)); // "$19.99"
console.log(formatPrice(50)); // "$0.50"
```

#### Use Cases

- Creating reusable transformation functions
- Building domain-specific utilities
- Function composition patterns
- Reducing code duplication

## Async Support

The async variants support **both synchronous and asynchronous functions** in the same pipeline using the `MaybePromise<T>` type, which allows seamless mixing of sync and async operations.

Async utilities are imported from the `@thuum/piper/async` subpath:

```typescript
import { pipe, build } from "@thuum/piper/async";
```

### `pipe(value)` (async)

Transform values through a chain that accepts both sync and async functions. The value itself can also be a Promise.

#### Signature

```typescript
type MaybePromise<T> = T | Promise<T>;

function pipe<T>(value: MaybePromise<T>): ValuePipe<T>;

interface ValuePipe<T> {
  pipe<R>(fn: (x: T) => MaybePromise<R>): ValuePipe<R>;
  readonly value: MaybePromise<T>;
}
```

#### Examples

##### Fetching and transforming API data

```typescript
import { pipe } from "@thuum/piper/async";

const { value: userName } = pipe(fetch("/api/user/1"))
  .pipe((res) => res.json())
  .pipe((data) => data.name)
  .pipe((name) => name.toUpperCase());

const result = await userName; // "ALICE"
```

##### Mixing sync and async steps

```typescript
import { pipe } from "@thuum/piper/async";

const { value } = pipe(5)
  .pipe((x) => x * 2) // sync
  .pipe(async (x) => await lookupLabel(x)) // async I/O
  .pipe((label) => label.trim()); // sync

const result = await value;
```

##### Starting from an existing Promise

```typescript
import { pipe } from "@thuum/piper/async";

const { value } = pipe(Promise.resolve("raw input"))
  .pipe((s) => s.trim())
  .pipe(async (s) => await translate(s, "en", "fr"));

const result = await value;
```

##### Error propagation — rejected promises short-circuit the chain

```typescript
import { pipe } from "@thuum/piper/async";

const { value } = pipe(1)
  .pipe(() => Promise.reject(new Error("boom")))
  .pipe((x) => x + 1); // never called

await value; // throws Error("boom")
```

### `build<T>()` (async)

Compose a reusable function from both sync and async transformations.

#### Signature

```typescript
type MaybePromise<T> = T | Promise<T>;

function build<X>(): FunctionPipe<X, X>;

interface FunctionPipe<X, Y> {
  pipe<Z>(fn: (y: Y) => MaybePromise<Z>): FunctionPipe<X, Z>;
  fn: (x: X) => MaybePromise<Y>;
}
```

#### Examples

##### Composing an API client handler

```typescript
import { build } from "@thuum/piper/async";

const { fn: getUser } = build<number>()
  .pipe(async (id) => fetch(`/api/users/${id}`))
  .pipe((res) => res.json())
  .pipe((data) => ({ id: data.id, name: data.name }));

const user = await getUser(42);
console.log(user.name); // "Alice"
```

##### Reusable file processing pipeline

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

##### Mixed sync/async with error short-circuiting

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

#### Why MaybePromise?

The `MaybePromise<T>` type allows you to:

- **Mix function types**: Use both sync and async functions in the same pipeline
- **Optimize performance**: Use sync functions when possible, async only when needed
- **Simplify code**: No need to wrap sync functions in `Promise.resolve()`
- **Type safety**: TypeScript ensures the entire pipeline is correctly typed

## Advanced Examples

### Complex Data Transformation

```typescript
import { pipe } from "@thuum/piper";

interface User {
  name: string;
  age: number;
  email: string;
}

const { value: summary } = pipe({
  name: "Alice",
  age: 30,
  email: "alice@example.com",
})
  .pipe((user) => ({ ...user, age: user.age + 1 }))
  .pipe((user) => ({
    fullName: user.name.toUpperCase(),
    isAdult: user.age >= 18,
    contact: user.email,
  }))
  .pipe((data) => `${data.fullName} (Adult: ${data.isAdult})`);

console.log(summary); // "ALICE (Adult: true)"
```

### Building Utility Functions

```typescript
import { build } from "@thuum/piper";

// Create a string sanitizer
const { fn: sanitize } = build<string>()
  .pipe((str) => str.trim())
  .pipe((str) => str.toLowerCase())
  .pipe((str) => str.replace(/\s+/g, "-"))
  .pipe((str) => str.replace(/[^a-z0-9-]/g, ""));

console.log(sanitize("  Hello World! 123  ")); // "hello-world-123"
console.log(sanitize("TypeScript & Node.js")); // "typescript-nodejs"
```

### Async API Workflow with Mixed Sync/Async

```typescript
import { build } from "@thuum/piper/async";

interface ApiResponse {
  data: { id: number; value: string }[];
}

const { fn: fetchUserData } = build<number>()
  .pipe(async (userId) => {
    const response = await fetch(`/api/users/${userId}`);
    return response.json() as Promise<ApiResponse>;
  })
  .pipe((response) => response.data) // sync
  .pipe((data) => data.map((item) => item.value)) // sync
  .pipe((values) => values.join(", ")); // sync

const result = await fetchUserData(42);
```

### Error Handling with Async Pipeline

```typescript
import { build } from "@thuum/piper/async";

const { fn: safeFetch } = build<string>()
  .pipe(async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    } catch (error) {
      return { error: error.message };
    }
  })
  .pipe((result) => {
    if ("error" in result) {
      return `Error: ${result.error}`;
    }
    return `Success: ${JSON.stringify(result)}`;
  });

const result = await safeFetch("https://api.example.com/data");
```

### Combining with @thuum/decor

```typescript
import { build } from "@thuum/piper";
import { attempt } from "@thuum/decor";

const { fn: safeDivide } = build<{ a: number; b: number }>()
  .pipe(({ a, b }) => {
    if (b === 0) throw new Error("Division by zero");
    return a / b;
  })
  .pipe((result) => Math.round(result * 100) / 100);

// Wrap with attempt for error handling
const divideSafe = attempt(safeDivide);

const result1 = divideSafe({ a: 10, b: 2 });
console.log(result1); // { value: 5, error: undefined }

const result2 = divideSafe({ a: 10, b: 0 });
console.log(result2); // { value: undefined, error: Error("Division by zero") }
```

### Real-World Example: Data Processing Pipeline

```typescript
import { pipe } from "@thuum/piper/async";

interface RawData {
  timestamp: string;
  value: string;
}

interface ProcessedData {
  date: Date;
  value: number;
  category: string;
}

const { value } = pipe<RawData[]>(fetch("/api/data").then((r) => r.json()))
  .pipe((data) => data.filter((item) => item.value !== null)) // sync
  .pipe(async (data) => {
    // Simulate async validation
    await new Promise((resolve) => setTimeout(resolve, 100));
    return data;
  })
  .pipe((data) =>
    data.map((item) => ({
      // sync
      date: new Date(item.timestamp),
      value: parseFloat(item.value),
      category: parseFloat(item.value) > 100 ? "high" : "low",
    })),
  )
  .pipe((data) =>
    data.sort(
      (
        a,
        b, // sync
      ) => b.date.getTime() - a.date.getTime(),
    ),
  );

const processed: ProcessedData[] = await value;
```

## TypeScript Support

Full type inference throughout the pipeline:

```typescript
import { pipe, build } from "@thuum/piper";
import { pipe as asyncPipe, build as asyncBuild } from "@thuum/piper/async";

// Sync pipe - types are automatically inferred at each step
const { value } = pipe(42)
  .pipe((x) => x.toString()) // x: number, returns: string
  .pipe((x) => x.length) // x: string, returns: number
  .pipe((x) => x > 1); // x: number, returns: boolean
// value is inferred as boolean

// Sync build
const { fn } = build<string>()
  .pipe((x) => x.split(",")) // returns: string[]
  .pipe((x) => x.length) // returns: number
  .pipe((x) => x * 2); // returns: number
// fn is inferred as (x: string) => number

// Async pipe with MaybePromise
const { value: asyncValue } = asyncPipe(42)
  .pipe((x) => x + 1) // sync: returns number
  .pipe(async (x) => x * 2) // async: returns Promise<number>
  .pipe((x) => x.toString()); // sync: returns string
// asyncValue is inferred as MaybePromise<string>

// Async build with MaybePromise
const { fn: asyncFn } = asyncBuild<number>()
  .pipe(async (x) => x + 1) // returns: MaybePromise<number>
  .pipe((x) => x * 2) // returns: MaybePromise<number>
  .pipe((x) => x.toString()); // returns: MaybePromise<string>
// asyncFn is inferred as (x: number) => MaybePromise<string>
```

## Comparison with Native Methods

### Without Piper

```typescript
const result = Math.round((parseInt(input.trim().toLowerCase()) + 10) * 2);
```

### With Piper

```typescript
import { pipe } from "@thuum/piper";

const { value: result } = pipe(input)
  .pipe((s) => s.trim())
  .pipe((s) => s.toLowerCase())
  .pipe((s) => parseInt(s))
  .pipe((n) => n + 10)
  .pipe((n) => n * 2)
  .pipe((n) => Math.round(n));
```

Benefits:

- More readable left-to-right flow
- Easier to debug (inspect intermediate values)
- Simple to add/remove transformation steps
- Type safety at each step
- Clear separation of concerns

## Package Exports

```typescript
// Sync exports
import { pipe, build } from "@thuum/piper";

// Async exports (from subpath)
import { pipe, build } from "@thuum/piper/async";

// To use both in the same file, alias the async imports
import { pipe, build } from "@thuum/piper";
import { pipe as asyncPipe, build as asyncBuild } from "@thuum/piper/async";
```

## License

ISC

## Contributing

Contributions are welcome! Please see the main [Thuum repository](https://github.com/jalepi/thuum) for contribution guidelines.

## Related Packages

- **[@thuum/decor](../decor)** - Function decorators for error handling and observability
- **[@thuum/transport](../transport)** - Abstract message transport layer
- **[@thuum/channels](../channels)** - Type-safe message channels
