---
title: "@thuum/transport"
description: Abstract message transport layer with pluggable implementations.
---

## Installation

```bash
npm install @thuum/transport
```

## Overview

`@thuum/transport` provides a `MessageTransport` interface for bidirectional message passing:

- **`createTransport(options)`** — Factory that creates a transport of the specified type
- **`MessageTransport`** — Interface with `receiver` (subscribe) and `sender` (publish) sides

## API

### `createTransport(options)`

Creates a `MessageTransport` instance of the specified type.

```typescript
import { createTransport } from "@thuum/transport";

const transport = createTransport({
  type: "window-custom-event",
  namespace: "my-app",
});

// Subscribe to a topic
const unsubscribe = transport.receiver.on("greeting", (message) => {
  console.log("Received:", message);
});

// Send a message
transport.sender.send("greeting", { text: "Hello!" });

// Cleanup
unsubscribe();
```

### `MessageTransport` Interface

```typescript
interface MessageTransport<R extends MessageMap, S extends MessageMap> {
  readonly receiver: MessageReceiver<R>;
  readonly sender: MessageSender<S>;
  readonly namespace: string;
}

interface MessageReceiver<Map extends MessageMap> {
  on<K extends keyof Map & string>(topic: K, handler: (message: Map[K]) => void): () => void;
}

interface MessageSender<Map extends MessageMap> {
  send<K extends keyof Map & string>(topic: K, message: Map[K]): void;
}
```

## Supported Transport Types

| Type                      | Status    |
| ------------------------- | --------- |
| `window-custom-event`     | Available |
| `window-message-event`    | Planned   |
| `broadcast-message-event` | Planned   |

### Window CustomEvent Transport

Uses `window.addEventListener` / `window.dispatchEvent` with `CustomEvent`. Events are scoped by namespace as `"namespace:topic"`.

Messages are dispatched asynchronously via `queueMicrotask` and the transport object is frozen to prevent mutation.
