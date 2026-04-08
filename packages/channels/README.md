# @thuum/channels

Type-safe message and request/response channels for inter-component communication.

## Installation

```bash
npm install @thuum/channels @thuum/transport
# or
bun add @thuum/channels @thuum/transport
```

## Overview

`@thuum/channels` provides schema-validated messaging patterns built on top of `@thuum/transport`:

- **`createMessageChannel()`** — One-way messaging with schema validation
- **`createRequestChannel()`** — Request/response pattern with automatic correlation and timeout handling

All messages are validated at runtime using configurable parsers and fully typed at compile time.

## Features

- 🔒 **Schema Validation** — Messages are parsed and validated before sending and receiving
- 📡 **One-Way Messaging** — Fire-and-forget message channels with topic-based routing
- 🔄 **Request/Response** — Correlated request/response pairs with automatic timeout
- 🎯 **Type Safe** — Full TypeScript inference from schema definitions
- ⚡ **Transport Agnostic** — Works with any `@thuum/transport` implementation

## API

### `createMessageChannel(options)`

Creates a channel for one-way messaging with a paired sender and receiver.

#### Parameters

- `options.schemas` — An object mapping topic names to `{ message: Parser }` entries
- `options.transport` — A `MessageTransport` from `@thuum/transport`

#### Example

```typescript
import { createMessageChannel } from "@thuum/channels";
import { createTransport } from "@thuum/transport";

const channel = createMessageChannel({
  schemas: {
    notification: {
      message: { parse: (data) => ({ value: data }) },
    },
  },
  transport: createTransport({ type: "window-custom-event", namespace: "app" }),
});

// Subscribe to messages
const sub = channel.receiver.on("notification", {
  ondata: ({ value }) => console.log("Received:", value),
  onerror: ({ error }) => console.error("Parse error:", error),
});

// Send a message
channel.sender.send("notification", { text: "Hello!" });

// Cleanup
sub.dispose();
```

### `createRequestChannel(options)`

Creates a channel for request/response communication with automatic correlation and timeout.

#### Parameters

- `options.schemas` — An object mapping topic names to `{ request: Parser, response: Parser }` entries
- `options.transport` — A `MessageTransport` from `@thuum/transport`

#### Example

```typescript
import { createRequestChannel } from "@thuum/channels";
import { createTransport } from "@thuum/transport";

const channel = createRequestChannel({
  schemas: {
    calculate: {
      request: { parse: (data) => ({ value: data }) },
      response: { parse: (data) => ({ value: data }) },
    },
  },
  transport: createTransport({ type: "window-custom-event", namespace: "app" }),
});

// Register a handler
channel.receiver.on("calculate", {
  ondata: async ({ value }) => value.a + value.b,
});

// Send a request and await the response
const result = await channel.sender.send("calculate", { a: 5, b: 3 });

if ("value" in result) {
  console.log("Result:", result.value); // 8
} else {
  console.error("Error:", result.error);
}
```

### Result Types

Channels use a `Result<V, E>` discriminated union for return values:

```typescript
type Val<T> = { readonly value: T };
type Err<T> = { readonly error: T; readonly trace?: readonly [T, ...T[]] };
type Result<V, E = unknown> = Val<V> | Err<E>;
```

## License

ISC
