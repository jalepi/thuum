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

`@thuum/piper` provides two main utilities for functional programming:

- **`pipe(value)`** - Transform a value through a chain of functions
- **`build<T>()`** - Compose functions into a reusable transformation pipeline

Both utilities support synchronous and asynchronous operations with full TypeScript type safety.

## Features

- 🔗 **Fluent API** - Chain transformations with `.pipe()`
- 🔄 **Function Composition** - Build reusable transformation pipelines
- ⚡ **Async Support** - Native Promise support for async operations
- 🎯 **Type Safe** - Full TypeScript inference throughout the chain
- 🪶 **Lightweight** - Zero dependencies
- 📦 **Dual Package** - ESM and CommonJS support

## API

### `pipe(value)`

Creates a pipe that transforms a value through a sequence of functions.

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
import pipe from "@thuum/piper";

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

Creates a reusable function by composing a sequence of transformations.

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

Both `pipe` and `build` have async counterparts for working with Promises.

### Async Pipe

Import from `@thuum/piper/async-pipe`:

```typescript
import pipe from "@thuum/piper/async-pipe";

const { value } = pipe(Promise.resolve(1))
  .pipe(async x => x + 1)
  .pipe(async x => x * 2);

const result = await value; // 4
```

### Async Build

Import from `@thuum/piper/async-build`:

```typescript
import { build } from "@thuum/piper/async-build";

const { fn: fetchAndProcess } = build<number>()
  .pipe(async id => fetch(`/api/users/${id}`))
  .pipe(async response => response.json())
  .pipe(async data => data.name);

const name = await fetchAndProcess(123);
```

## Advanced Examples

### Complex Data Transformation

```typescript
import pipe from "@thuum/piper";

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

### Async API Workflow

```typescript
import { build } from "@thuum/piper/async-build";

interface ApiResponse {
  data: { id: number; value: string }[];
}

const { fn: fetchUserData } = build<number>()
  .pipe(async userId => {
    const response = await fetch(`/api/users/${userId}`);
    return response.json() as Promise<ApiResponse>;
  })
  .pipe(async response => response.data)
  .pipe(async data => data.map(item => item.value))
  .pipe(async values => values.join(", "));

const result = await fetchUserData(42);
```

### Error Handling with Decorators

Combine with `@thuum/decor` for safe error handling:

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
const { fn: divide } = { fn: attempt(safeDivide) };

const result1 = divide({ a: 10, b: 2 });
console.log(result1); // { value: 5, error: undefined }

const result2 = divide({ a: 10, b: 0 });
console.log(result2); // { value: undefined, error: Error("Division by zero") }
```

## TypeScript Support

Full type inference throughout the pipeline:

```typescript
import pipe, { build } from "@thuum/piper";

// Types are automatically inferred at each step
const { value } = pipe(42)
  .pipe(x => x.toString())     // x: number, returns: string
  .pipe(x => x.length)         // x: string, returns: number
  .pipe(x => x > 1);           // x: number, returns: boolean

// value is inferred as boolean

// Type parameter only needed at the start
const { fn } = build<string>()
  .pipe(x => x.split(","))     // returns: string[]
  .pipe(x => x.length)         // returns: number
  .pipe(x => x * 2);           // returns: number

// fn is inferred as (x: string) => number
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

## License

ISC

## Contributing

Contributions are welcome! Please see the main [Thuum repository](https://github.com/jalepi/thuum) for contribution guidelines.