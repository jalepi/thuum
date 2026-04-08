---
title: "@thuum/channels"
description: Type-safe message and request/response channels for inter-component communication.
---

## Installation

```bash
npm install @thuum/channels @thuum/transport
```

:::note
`@thuum/channels` requires `@thuum/transport` as a peer dependency.
:::

## Overview

`@thuum/channels` provides schema-validated messaging patterns built on top of `@thuum/transport`:

- **`createMessageChannel()`** — One-way messaging with schema validation
- **`createRequestChannel()`** — Request/response pattern with automatic correlation and timeout

## API

### `createMessageChannel(options)`

Creates a channel for one-way messaging with a paired sender and receiver.

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

// Subscribe
const sub = channel.receiver.on("notification", {
  ondata: ({ value }) => console.log("Received:", value),
  onerror: ({ error }) => console.error("Parse error:", error),
});

// Send
channel.sender.send("notification", { text: "Hello!" });

// Cleanup
sub.dispose();
```

### `createRequestChannel(options)`

Creates a channel for request/response communication with automatic correlation and timeout handling.

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

// Send a request
const result = await channel.sender.send("calculate", { a: 5, b: 3 });

if ("value" in result) {
  console.log("Result:", result.value); // 8
} else {
  console.error("Error:", result.error);
}
```

## Result Types

Channels use a discriminated union for return values:

```typescript
type Val<T> = { readonly value: T };
type Err<T> = { readonly error: T; readonly trace?: readonly [T, ...T[]] };
type Result<V, E = unknown> = Val<V> | Err<E>;
```

## Schemas

Schemas define parsers that validate messages at runtime. Each parser must return a `Result`:

```typescript
type Parser<T> = {
  parse(value: T): Result<T>;
};

// Message schema: one parser per topic
const messageSchemas = {
  greeting: {
    message: {
      parse: (data) => {
        if (typeof data === "string") return { value: data };
        return { error: new Error("Expected string") };
      },
    },
  },
};

// Request schema: request + response parsers per topic
const requestSchemas = {
  calculate: {
    request: { parse: (data) => ({ value: data }) },
    response: { parse: (data) => ({ value: data }) },
  },
};
```
