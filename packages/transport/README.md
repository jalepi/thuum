# @thuum/transport

Abstract message transport layer with pluggable implementations.

## Installation

```bash
npm install @thuum/transport
# or
bun add @thuum/transport
```

## Overview

`@thuum/transport` provides a `MessageTransport` interface for bidirectional message passing, along with a factory function and built-in implementations:

- **`createTransport(options)`** — Factory that creates a transport of the specified type
- **`MessageTransport`** — Interface with `receiver` (subscribe) and `sender` (publish) sides
- **Window CustomEvent transport** — Built-in implementation using `window.dispatchEvent` / `window.addEventListener`

## Features

- 📦 **Transport Abstraction** — Decouple messaging logic from the underlying mechanism
- 🪟 **CustomEvent Transport** — Built-in support for window-scoped messaging via `CustomEvent`
- 🏷️ **Namespace Isolation** — Events are scoped by namespace to prevent collisions
- 🎯 **Type Safe** — Generic message maps enforce topic/payload type contracts
- 🪶 **Zero Dependencies** — No external dependencies

## API

### `createTransport(options)`

Creates a `MessageTransport` instance of the specified type.

#### Parameters

- `options.type` — Transport type: `"window-custom-event"` (more types planned)
- `options.namespace` — Namespace string for event scoping

#### Example

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

### Supported Transport Types

| Type                      | Description                                                                |
| ------------------------- | -------------------------------------------------------------------------- |
| `window-custom-event`     | Uses `window.addEventListener` / `window.dispatchEvent` with `CustomEvent` |
| `window-message-event`    | _Planned_                                                                  |
| `broadcast-message-event` | _Planned_                                                                  |

## License

ISC
