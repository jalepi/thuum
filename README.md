# Thuum

A TypeScript monorepo providing utility libraries for functional programming, error handling, messaging, and more.

## Overview

Thuum is a collection of focused, type-safe TypeScript libraries designed to enhance functional programming patterns and inter-component communication. The workspace includes:

- **[@thuum/decor](#thuum-decor)** - Function decorators for error handling and observability
- **[@thuum/piper](#thuum-piper)** - Functional pipe operators and function chaining with async support
- **[@thuum/transport](#thuum-transport)** - Abstract message transport layer
- **[@thuum/channels](#thuum-channels)** - Type-safe message and request/response channels
- **[@thuum/example](#thuum-example)** - Example package template

## Installation

### Prerequisites

- Node.js (v18 or higher recommended)
- Bun (v1.3 or higher)

### Quick Start

Clone the repository and install dependencies:

```bash
git clone https://github.com/jalepi/thuum.git
cd thuum
bun install
```

### Building All Packages

```bash
bun run --workspaces --sequential build
```

### Running Tests

```bash
# Run tests in watch mode
bun run test:watch

# Run tests once
bun run test

# Run all tests in CI mode (with coverage and JUnit reporting)
bun run test:ci

# Run full CI pipeline (build, test, format, lint)
bun run build:ci
```

## Packages

### @thuum/decor

Function decorators for safer error handling and function observability.

#### Features

- **`attempt(fn)`** - Wraps functions to return `Result<T>` instead of throwing errors
- **`probe(probeFn)`** - Creates decorators for tracing function execution (arguments and results)
- Async versions available for Promise-based functions

#### Example

```typescript
import { attempt, probe } from "@thuum/decor";

// Error handling with attempt
const divide = (a: number, b: number) => {
  if (b === 0) throw new Error("Divide by zero");
  return a / b;
};

const safeDivide = attempt(divide);
const { value, error } = safeDivide(10, 2);

if (error) {
  console.error("Division failed:", error);
} else {
  console.log("Result:", value);
}

// Function tracing with probe
const trace = probe(({ args }) => {
  console.log("Called with:", args);
  return (result) => {
    if ("error" in result) {
      console.log("Failed:", result.error);
    } else {
      console.log("Succeeded:", result.value);
    }
  };
});

const logger = { name: "myLogger" };
const tracedHello = trace(logger, (name: string) => `Hello, ${name}!`);
tracedHello("World"); // Logs arguments and result
```

### @thuum/piper

Functional programming utilities for pipe operations and function composition with support for both synchronous and asynchronous operations.

#### Features

- **`pipe(value)`** - Chain synchronous transformations on a value
- **`build<T>()`** - Build composed functions from synchronous transformations
- **`asyncPipe(value)`** - Chain transformations that support both sync and async functions
- **`asyncBuild<T>()`** - Build composed functions mixing sync and async operations
- **`MaybePromise<T>`** - Type that allows seamless mixing of sync and async functions

#### Example

```typescript
import { pipe, build, asyncPipe, asyncBuild } from "@thuum/piper";

// Synchronous value pipe - transform a value through a chain
const { value } = pipe(1)
  .pipe((x) => x + 1)
  .pipe((x) => x * 2);

console.log(value); // 4

// Synchronous function builder - create a reusable function
const { fn } = build<number>()
  .pipe((x) => x + 1)
  .pipe((x) => x * 2);

console.log(fn(1)); // 4
console.log(fn(5)); // 12

// Async pipe - mix sync and async functions freely
const { value: asyncValue } = asyncPipe(1)
  .pipe((x) => x + 1) // sync function
  .pipe(async (x) => Promise.resolve(x * 2)) // async function
  .pipe((x) => x.toString()); // sync function

const result = await asyncValue; // "4"

// Async build - compose reusable async pipelines
const { fn: fetchUser } = asyncBuild<number>()
  .pipe(async (id) => fetch(`/api/users/${id}`))
  .pipe(async (res) => res.json())
  .pipe((data) => data.name) // sync functions work too!
  .pipe((name) => name.toUpperCase());

const userName = await fetchUser(123);
```

### @thuum/transport

Abstract message transport layer providing a unified interface for message passing.

#### Features

- Type-safe message sender and receiver interfaces
- Support for custom transport implementations
- Window `CustomEvent` transport included
- Namespace support for message isolation

#### Example

```typescript
import { createTransport } from "@thuum/transport";

const transport = createTransport({
  namespace: "my-app",
  target: window,
});

// Subscribe to messages
const unsubscribe = transport.receiver.on("greeting", (message) => {
  console.log("Received:", message);
});

// Send messages
transport.sender.send("greeting", { text: "Hello!" });

// Cleanup
unsubscribe();
```

### @thuum/channels

Type-safe message and request/response channels built on top of the transport layer.

#### Features

- **Message Channels** - One-way messaging with schema validation
- **Request Channels** - Request/response pattern with automatic timeout handling
- Built-in schema parsing and validation
- Type-safe topic-based routing

#### Example

```typescript
import { createMessageChannel, createRequestChannel } from "@thuum/channels";
import { createTransport } from "@thuum/transport";

// Message Channel
const messageChannel = createMessageChannel({
  schemas: {
    notification: {
      message: {
        parse: (data) => ({ value: data }),
      },
    },
  },
  transport: createTransport({ namespace: "app", target: window }),
});

messageChannel.receiver.on("notification", {
  ondata: ({ value }) => console.log(value),
  onerror: ({ error }) => console.error(error),
});

messageChannel.sender.send("notification", { text: "New message!" });

// Request Channel
const requestChannel = createRequestChannel({
  schemas: {
    calculate: {
      request: { parse: (data) => ({ value: data }) },
      response: { parse: (data) => ({ value: data }) },
    },
  },
  transport: createTransport({ namespace: "app", target: window }),
});

requestChannel.receiver.on("calculate", {
  ondata: async ({ value }) => {
    return value.a + value.b;
  },
});

const result = await requestChannel.sender.send("calculate", { a: 5, b: 3 });
if ("value" in result) {
  console.log("Result:", result.value); // 8
}
```

### @thuum/example

A template package demonstrating the monorepo structure and build configuration.

## Development

### Project Structure

```
thuum/
├── packages/
│   ├── channels/       # Message and request channels
│   ├── decor/          # Function decorators
│   ├── example/        # Example package
│   ├── piper/          # Pipe utilities
│   └── transport/      # Transport layer
├── package.json        # Workspace root package
├── package.json        # Workspace configuration (workspaces)
├── tsconfig.base.json  # Base TypeScript config
├── bunfig.toml         # Bun test configuration
└── README.md           # This file
```

### Available Scripts

In the workspace root:

```bash
# Linting
bun run lint            # Check for linting errors
bun run format          # Check code formatting
bun run format:fix      # Auto-fix formatting issues

# Testing
bun run test            # Run tests once
bun run test:watch      # Run tests in watch mode
bun run test:ci         # Run tests in CI mode (with coverage)
bun run build:ci        # Full CI pipeline (build, test, format, lint)

# Building
bun run --workspaces --sequential build # Build all packages
```

In individual packages:

```bash
cd packages/<package-name>
bun run build           # Build both ESM and CJS
bun run build:esm       # Build ESM only
bun run build:cjs       # Build CJS only
```

### Adding a New Package

1. Create package directory in `packages/`
2. Add `package.json` with workspace dependencies
3. Create TypeScript configs (`tsconfig.*.json`)
4. Add source files in `src/`
5. Run `bun install` from workspace root

### Technology Stack

- **Package Manager**: Bun with workspaces
- **Language**: TypeScript 5.8+
- **Build**: TypeScript compiler (dual ESM/CJS output)
- **Testing**: Bun test runner with built-in coverage
- **Linting**: ESLint 9 with TypeScript support
- **Formatting**: Prettier 3
- **Dependency Management**: Explicit semver ranges in workspace package manifests

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Ensure tests pass (`bun run build:ci`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style

- Follow existing code patterns
- Write tests for new features
- Ensure TypeScript types are properly defined
- Run `bun run format:fix` before committing

## License

MIT © 2025 jalepi

See [LICENSE](./LICENSE) for more information.

## Monorepo Setup Guide

This section documents how this monorepo is configured.

### Initial Setup

Initialize package:

```bash
bun init
```

Add a `workspaces` field to the root `package.json`:

```json
"workspaces": [
  "packages/*"
]
```

### ESLint + Prettier

Install packages:

```bash
bun add -D @eslint/js eslint eslint-config-prettier eslint-plugin-prettier globals prettier typescript-eslint
```

Create `eslint.config.mjs` and `prettier.config.mjs` files.

Add scripts to `package.json`:

```json
"scripts": {
  "lint": "eslint . --cache --report-unused-disable-directives --max-warnings 0",
  "format": "prettier --check --cache '**/*.{cjs,mjs,js,jsx,cts,mts,ts,tsx,json}'",
  "format:fix": "prettier --write '**/*.{cjs,mjs,js,jsx,cts,mts,ts,tsx,json}'"
}
```

Use explicit semver ranges for dependencies.

### TypeScript

Install TypeScript:

```bash
bun add -D typescript tslib
```

Create `tsconfig.base.json` with shared configuration.

### Testing

Bun includes a built-in test runner (`bun:test`) with coverage support:

```bash
bun add -D @happy-dom/global-registrator
```

Create `bunfig.toml` with test configuration:

```toml
[test]
preload = ["./test-preload.ts"]
coverageThreshold = { lines = 0.9, functions = 0.9, statements = 0.9 }
```

Add scripts to `package.json`:

```json
"scripts": {
  "test": "bun test packages",
  "test:ci": "bun test packages --coverage --coverage-reporter=lcov"
}
```
