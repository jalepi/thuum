# @thuum/piper

Functional programming utilities for pipe operations and function composition in TypeScript.

## Installation

```bash
npm install @thuum/piper
# or
pnpm add @thuum/piper
# or
yarn add @thuum/piper
```

## Overview

`@thuum/piper` provides utilities for functional programming with support for both synchronous and asynchronous operations:

- **`pipe(value)`** - Transform a value through a chain of synchronous functions
- **`build<T>()`** - Compose synchronous functions into a reusable transformation pipeline
- **`asyncPipe(value)`** - Transform values through chains that support both sync and async functions
- **`asyncBuild<T>()`** - Compose functions (sync or async) into a reusable async pipeline

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
function pipe<T>(value: T): ValuePipe<T>

interface ValuePipe<T> {
  pipe<R>(fn: (x: T) => R): ValuePipe<R>;
  readonly value: T;
}
```

#### Example

```typescript
import { pipe } from "@thuum/piper";

const { value } = pipe(1)
  .pipe(x => x + 1)      // 2
  .pipe(x => x * 2)      // 4
  .pipe(x => `Result: ${x}`); // "Result: 4"

console.log(value); // "Result: 4"
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
function build<X>(): FunctionPipe<X, X>

interface FunctionPipe<X, Y> {
  pipe<Z>(fn: (y: Y) => Z): FunctionPipe<X, Z>;
  fn: (x: X) => Y;
}
```

#### Example

```typescript
import { build } from "@thuum/piper";

const { fn: processNumber } = build<number>()
  .pipe(x => x + 1)
  .pipe(x => x * 2)
  .pipe(x => `Result: ${x}`);

console.log(processNumber(1));  // "Result: 4"
console.log(processNumber(5));  // "Result: 12"
console.log(processNumber(10)); // "Result: 22"
```

#### Use Cases

- Creating reusable transformation functions
- Building domain-specific utilities
- Function composition patterns
- Reducing code duplication

## Async Support

The async variants support **both synchronous and asynchronous functions** in the same pipeline using the `MaybePromise<T>` type, which allows seamless mixing of sync and async operations.

### `asyncPipe(value)`

Transform values through a chain that accepts both sync and async functions. The value itself can also be a Promise.

#### Signature

```typescript
type MaybePromise<T> = T | Promise<T>;

function asyncPipe<T>(value: MaybePromise<T>): ValuePipe<T>

interface ValuePipe<T> {
  pipe<R>(fn: (x: T) => MaybePromise<R>): ValuePipe<R>;
  readonly value: MaybePromise<T>;
}
```

#### Example

```typescript
import { asyncPipe } from "@thuum/piper";

// Mix sync and async functions freely
const { value } = asyncPipe(1)
  .pipe(x => x + 1)                    // sync function
  .pipe(async x => x * 2)              // async function
  .pipe(x => x.toString())             // sync function
  .pipe(async x => `Result: ${x}`);   // async function

const result = await value; // "Result: 4"
```

#### Starting with a Promise

```typescript
import { asyncPipe } from "@thuum/piper";

const { value } = asyncPipe(Promise.resolve(5))
  .pipe(x => x + 1)           // 6
  .pipe(async x => x * 2);    // 12

const result = await value; // 12
```

### `asyncBuild<T>()`

Compose a reusable function from both sync and async transformations.

#### Signature

```typescript
type MaybePromise<T> = T | Promise<T>;

function asyncBuild<X>(): FunctionPipe<X, X>

interface FunctionPipe<X, Y> {
  pipe<Z>(fn: (y: Y) => MaybePromise<Z>): FunctionPipe<X, Z>;
  fn: (x: X) => MaybePromise<Y>;
}
```

#### Example

```typescript
import { asyncBuild } from "@thuum/piper";

// Mix sync and async operations
const { fn: fetchAndProcess } = asyncBuild<number>()
  .pipe(async id => fetch(`/api/users/${id}`))    // async
  .pipe(async response => response.json())         // async
  .pipe(data => data.name)                         // sync
  .pipe(name => name.toUpperCase());               // sync

const name = await fetchAndProcess(123);
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
  email: "alice@example.com" 
})
  .pipe(user => ({ ...user, age: user.age + 1 }))
  .pipe(user => ({ 
    fullName: user.name.toUpperCase(),
    isAdult: user.age >= 18,
    contact: user.email
  }))
  .pipe(data => `${data.fullName} (Adult: ${data.isAdult})`);

console.log(summary); // "ALICE (Adult: true)"
```

### Building Utility Functions

```typescript
import { build } from "@thuum/piper";

// Create a string sanitizer
const { fn: sanitize } = build<string>()
  .pipe(str => str.trim())
  .pipe(str => str.toLowerCase())
  .pipe(str => str.replace(/\s+/g, "-"))
  .pipe(str => str.replace(/[^a-z0-9-]/g, ""));

console.log(sanitize("  Hello World! 123  ")); // "hello-world-123"
console.log(sanitize("TypeScript & Node.js")); // "typescript-nodejs"
```

### Async API Workflow with Mixed Sync/Async

```typescript
import { asyncBuild } from "@thuum/piper";

interface ApiResponse {
  data: { id: number; value: string }[];
}

const { fn: fetchUserData } = asyncBuild<number>()
  .pipe(async userId => {
    const response = await fetch(`/api/users/${userId}`);
    return response.json() as Promise<ApiResponse>;
  })
  .pipe(response => response.data)              // sync
  .pipe(data => data.map(item => item.value))   // sync
  .pipe(values => values.join(", "));           // sync

const result = await fetchUserData(42);
```

### Error Handling with Async Pipeline

```typescript
import { asyncBuild } from "@thuum/piper";

const { fn: safeFetch } = asyncBuild<string>()
  .pipe(async url => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    } catch (error) {
      return { error: error.message };
    }
  })
  .pipe(result => {
    if ('error' in result) {
      return `Error: ${result.error}`;
    }
    return `Success: ${JSON.stringify(result)}`;
  });

const result = await safeFetch('https://api.example.com/data');
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
  .pipe(result => Math.round(result * 100) / 100);

// Wrap with attempt for error handling
const divideSafe = attempt(safeDivide);

const result1 = divideSafe({ a: 10, b: 2 });
console.log(result1); // { value: 5, error: undefined }

const result2 = divideSafe({ a: 10, b: 0 });
console.log(result2); // { value: undefined, error: Error("Division by zero") }
```

### Real-World Example: Data Processing Pipeline

```typescript
import { asyncPipe } from "@thuum/piper";

interface RawData {
  timestamp: string;
  value: string;
}

interface ProcessedData {
  date: Date;
  value: number;
  category: string;
}

const { value } = asyncPipe<RawData[]>(
  fetch('/api/data').then(r => r.json())
)
  .pipe(data => data.filter(item => item.value !== null))  // sync
  .pipe(async data => {
    // Simulate async validation
    await new Promise(resolve => setTimeout(resolve, 100));
    return data;
  })
  .pipe(data => data.map(item => ({                        // sync
    date: new Date(item.timestamp),
    value: parseFloat(item.value),
    category: parseFloat(item.value) > 100 ? 'high' : 'low'
  })))
  .pipe(data => data.sort((a, b) =>                        // sync
    b.date.getTime() - a.date.getTime()
  ));

const processed: ProcessedData[] = await value;
```

## TypeScript Support

Full type inference throughout the pipeline:

```typescript
import { pipe, build, asyncPipe, asyncBuild } from "@thuum/piper";

// Sync pipe - types are automatically inferred at each step
const { value } = pipe(42)
  .pipe(x => x.toString())     // x: number, returns: string
  .pipe(x => x.length)         // x: string, returns: number
  .pipe(x => x > 1);           // x: number, returns: boolean
// value is inferred as boolean

// Sync build
const { fn } = build<string>()
  .pipe(x => x.split(","))     // returns: string[]
  .pipe(x => x.length)         // returns: number
  .pipe(x => x * 2);           // returns: number
// fn is inferred as (x: string) => number

// Async pipe with MaybePromise
const { value: asyncValue } = asyncPipe(42)
  .pipe(x => x + 1)            // sync: returns number
  .pipe(async x => x * 2)      // async: returns Promise<number>
  .pipe(x => x.toString());    // sync: returns string
// asyncValue is inferred as MaybePromise<string>

// Async build with MaybePromise
const { fn: asyncFn } = asyncBuild<number>()
  .pipe(async x => x + 1)      // returns: MaybePromise<number>
  .pipe(x => x * 2)            // returns: MaybePromise<number>
  .pipe(x => x.toString());    // returns: MaybePromise<string>
// asyncFn is inferred as (x: number) => MaybePromise<string>
```

## Comparison with Native Methods

### Without Piper

```typescript
const result = Math.round(
  ((parseInt(
    input.trim().toLowerCase()
  ) + 10) * 2)
);
```

### With Piper

```typescript
const { value: result } = pipe(input)
  .pipe(s => s.trim())
  .pipe(s => s.toLowerCase())
  .pipe(s => parseInt(s))
  .pipe(n => n + 10)
  .pipe(n => n * 2)
  .pipe(n => Math.round(n));
```

Benefits:
- More readable left-to-right flow
- Easier to debug (inspect intermediate values)
- Simple to add/remove transformation steps
- Type safety at each step
- Clear separation of concerns

## Package Exports

```typescript
// Main exports (sync)
import { pipe, build } from "@thuum/piper";

// Async exports
import { asyncPipe, asyncBuild } from "@thuum/piper";

// Or import individually
import pipe from "@thuum/piper"; // default export is pipe
import { build } from "@thuum/piper";
import { asyncPipe } from "@thuum/piper";
import { asyncBuild } from "@thuum/piper";
```

## License

ISC

## Contributing

Contributions are welcome! Please see the main [Thuum repository](https://github.com/jalepi/thuum) for contribution guidelines.

## Related Packages

- **[@thuum/decor](../decor)** - Function decorators for error handling and observability
- **[@thuum/transport](../transport)** - Abstract message transport layer
- **[@thuum/channels](../channels)** - Type-safe message channels