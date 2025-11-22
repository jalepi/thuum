# Thuum

A TypeScript monorepo providing utility libraries for functional programming, error handling, messaging, and more.

## Overview

Thuum is a collection of focused, type-safe TypeScript libraries designed to enhance functional programming patterns and inter-component communication. The workspace includes:

- **[@thuum/decor](#thuum-decor)** - Function decorators for error handling and observability
- **[@thuum/piper](#thuum-piper)** - Functional pipe operators and function chaining utilities
- **[@thuum/transport](#thuum-transport)** - Abstract message transport layer
- **[@thuum/channels](#thuum-channels)** - Type-safe message and request/response channels
- **[@thuum/example](#thuum-example)** - Example package template

## Installation

### Prerequisites

- Node.js (v18 or higher recommended)
- pnpm (v8 or higher)

### Quick Start

Clone the repository and install dependencies:

```bash
git clone https://github.com/jalepi/thuum.git
cd thuum
pnpm install
```

### Building All Packages

```bash
pnpm -r run build
```

### Running Tests

```bash
# Run tests in watch mode
pnpm run test:watch

# Run tests once
pnpm run test

# Run tests with UI
pnpm run test:ui

# Run all tests in CI mode
pnpm run test:ci

# Run full test suite (build, format, lint, test)
pnpm run test:all
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
const trace = probe(({ ctx, args }) => {
  console.log("Called with:", args);
  return (result) => {
    if ("error" in result) {
      console.log("Failed:", result.error);
    } else {
      console.log("Succeeded:", result.value);
    }
  };
});

const tracedHello = trace({}, (name: string) => `Hello, ${name}!`);
tracedHello("World"); // Logs arguments and result
```

### @thuum/piper

Functional programming utilities for pipe operations and function composition.

#### Features

- **`pipe(value)`** - Chain transformations on a value
- **`build<T>()`** - Build composed functions from a chain of transformations

#### Example

```typescript
import pipe, { build } from "@thuum/piper";

// Value pipe - transform a value through a chain
const { value } = pipe(1)
  .pipe(x => x + 1)
  .pipe(x => x * 2);

console.log(value); // 4

// Function builder - create a reusable function
const { fn } = build<number>()
  .pipe(x => x + 1)
  .pipe(x => x * 2);

console.log(fn(1)); // 4
console.log(fn(5)); // 12
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
        parse: (data) => ({ value: data })
      }
    }
  },
  transport: createTransport({ namespace: "app", target: window })
});

messageChannel.receiver.on("notification", {
  ondata: ({ value }) => console.log(value),
  onerror: ({ error }) => console.error(error)
});

messageChannel.sender.send("notification", { text: "New message!" });

// Request Channel
const requestChannel = createRequestChannel({
  schemas: {
    calculate: {
      request: { parse: (data) => ({ value: data }) },
      response: { parse: (data) => ({ value: data }) }
    }
  },
  transport: createTransport({ namespace: "app", target: window })
});

requestChannel.receiver.on("calculate", {
  ondata: async ({ value }) => {
    return value.a + value.b;
  }
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
├── pnpm-workspace.yaml # Workspace configuration
├── tsconfig.base.json  # Base TypeScript config
├── vitest.config.mjs   # Vitest configuration
└── README.md           # This file
```

### Available Scripts

In the workspace root:

```bash
# Linting
pnpm run lint           # Check for linting errors
pnpm run format         # Check code formatting
pnpm run format:fix     # Auto-fix formatting issues

# Testing
pnpm run test           # Run tests once
pnpm run test:watch     # Run tests in watch mode
pnpm run test:ui        # Run tests with UI
pnpm run test:ci        # Run tests in CI mode
pnpm run test:all       # Build, format, lint, and test

# Building
pnpm -r run build       # Build all packages
```

In individual packages:

```bash
cd packages/<package-name>
pnpm run build          # Build both ESM and CJS
pnpm run build:esm      # Build ESM only
pnpm run build:cjs      # Build CJS only
```

### Adding a New Package

1. Create package directory in `packages/`
2. Add `package.json` with workspace dependencies
3. Create TypeScript configs (`tsconfig.*.json`)
4. Add source files in `src/`
5. Run `pnpm install` from workspace root

### Technology Stack

- **Package Manager**: pnpm with workspace support
- **Language**: TypeScript 5.8+
- **Build**: TypeScript compiler (dual ESM/CJS output)
- **Testing**: Vitest with coverage
- **Linting**: ESLint 9 with TypeScript support
- **Formatting**: Prettier 3
- **Dependency Management**: pnpm catalogs for version consistency

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Ensure tests pass (`pnpm run test:all`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style

- Follow existing code patterns
- Write tests for new features
- Ensure TypeScript types are properly defined
- Run `pnpm run format:fix` before committing

## License

MIT © 2025 jalepi

See [LICENSE](./LICENSE) for more information.

## Monorepo Setup Guide

This section documents how this monorepo was initially configured for reference.

### Initial Setup

Initialize package:

```bash
pnpm init
```

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - packages/*
```

### ESLint + Prettier

Install packages:

```bash
pnpm install -w -D @eslint/js eslint eslint-config-prettier eslint-plugin-prettier globals prettier typescript-eslint
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

Catalog lint packages:

```bash
pnpx codemod pnpm/catalog
```

### TypeScript

Install TypeScript:

```bash
pnpm install -w -D typescript tslib
```

Create `tsconfig.base.json` with shared configuration.

### Vitest

Install Vitest:

```bash
pnpm install -w -D vitest @vitest/coverage-v8 happy-dom
```

Add `vitest.workspace.mjs` and `vitest.config.mjs` files.

Add scripts to `package.json`:

```json
"scripts": {
  "test": "vitest",
  "test:ci": "vitest run --mode=ci"
}
```
