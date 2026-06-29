# @thuum/event-emitter

Type-safe event emitter adapters for EventTarget, MessagePort, Node.js EventEmitter, and RxJS.

## Installation

```bash
npm install @thuum/event-emitter
# or
bun add @thuum/event-emitter
```

## Overview

`@thuum/event-emitter` provides a unified, type-safe interface for pub/sub communication across different runtime backends:

- **`eventTarget`** — Adapter for the DOM `EventTarget` API (browsers, Deno, Node 15+)
- **`messagePort`** — Adapter for `BroadcastChannel`, `MessagePort`, `Worker`, and `Window.postMessage`
- **`nodeEvents`** — Adapter for Node.js `EventEmitter`
- **`rxjs`** — Adapter for RxJS `Subject` / `Observable`
- **`connect`** — Utility to forward events between any listener→emitter pair

Each adapter exposes the same two-function surface — `emitter(source)` and `listener(source)` — making it trivial to swap transports without changing application logic.

## Features

- 🎯 **Type Safe** — Event names and payloads are checked at compile time
- 🔌 **Multi-Backend** — One interface, four transports: DOM, MessagePort, Node.js, RxJS
- 🧩 **Composable** — Mix and match adapters; connect any listener to any emitter
- 🪶 **Zero Dependencies** — No external runtime dependencies
- ❄️ **Frozen Instances** — All returned objects are `Object.freeze`d for safety
- 🛑 **Deterministic Cleanup** — Every subscription returns a `{ stop() }` handle

## Architecture

The library is built around two core interfaces that all adapters implement:

```typescript
interface Emitter<Map extends EventMap> {
  emit<K extends keyof Map>(name: K & string, value: Map[K & string]): void;
}

interface Listener<Map extends EventMap> {
  on<K extends keyof Map>(
    name: K & string,
    handler: (value: Map[K & string]) => void,
  ): { stop(): void };
}
```

An `EventMap` is simply a record mapping string event names to payload types:

```typescript
type EventMap = { [name: string]: unknown };
```

This shared contract means you can write transport-agnostic code and swap the underlying backend without changing your event handling logic.

## Choosing an Adapter

| Adapter | Import Path | Transport | Use Case |
|---------|-------------|-----------|----------|
| **eventTarget** | `@thuum/event-emitter/event-target` | DOM `EventTarget` | In-process pub/sub, custom elements, service workers |
| **messagePort** | `@thuum/event-emitter/message-port` | `postMessage` channel | Cross-window, cross-worker, `BroadcastChannel` communication |
| **nodeEvents** | `@thuum/event-emitter/node-events` | Node.js `EventEmitter` | Server-side event buses, streams, CLI tools |
| **rxjs** | `@thuum/event-emitter/rxjs` | RxJS `Subject` | Reactive pipelines, multiplexed event streams |

### When to Choose Which

- **`eventTarget`** — You want in-process pub/sub that interops with native DOM event listeners and `CustomEvent`.
- **`messagePort`** — You need to send typed events across execution contexts (windows, workers, iframes).
- **`nodeEvents`** — You're in Node.js and want type safety on top of the built-in `EventEmitter`.
- **`rxjs`** — You're already using RxJS and want to multiplex typed events through a single `Subject`.
- **`connect`** — You want to bridge two systems together, forwarding specific events from one to another.

---

## API

### Core Types

```typescript
import type { EventMap, EventUnion, Emitter, Listener } from "@thuum/event-emitter";
```

#### `EventMap`

Base constraint for event maps — a record of string keys to payload types.

```typescript
type MyEvents = {
  message: string;
  error: Error;
  disconnect: undefined;
};
```

#### `EventUnion<Map>`

Converts an event map into a discriminated union of `{ name, value }` pairs. Used internally by the message-port and rxjs adapters to multiplex events through a single channel.

```typescript
type MyEvents = { message: string; error: Error };

type Union = EventUnion<MyEvents>;
// => { name: "message"; value: string } | { name: "error"; value: Error }
```

#### `Emitter<Map>`

Interface for type-safe event dispatching.

```typescript
declare const emitter: Emitter<MyEvents>;

emitter.emit("message", "hello"); // ✓
emitter.emit("error", new Error("fail")); // ✓
emitter.emit("message", 42); // ✗ type error
```

#### `Listener<Map>`

Interface for type-safe event subscription. Returns a `{ stop() }` handle for deterministic cleanup.

```typescript
declare const listener: Listener<MyEvents>;

const sub = listener.on("message", (value) => {
  console.log(value); // typed as `string`
});

sub.stop(); // unsubscribe
```

---

### `eventTarget`

```typescript
import { emitter, listener } from "@thuum/event-emitter/event-target";
```

Adapts a DOM `EventTarget`. Events are dispatched as `CustomEvent` with payloads in the `detail` property.

#### Emitting Events

```typescript
import { emitter } from "@thuum/event-emitter/event-target";

type Events = {
  login: { userId: string };
  logout: undefined;
};

const target = new EventTarget();
const emit = emitter<Events>(target);

emit.emit("login", { userId: "abc-123" });
emit.emit("logout", undefined);
```

#### Listening for Events

```typescript
import { emitter, listener } from "@thuum/event-emitter/event-target";

type Events = {
  message: { text: string; from: string };
  disconnect: undefined;
};

const target = new EventTarget();
const emit = emitter<Events>(target);
const listen = listener<Events>(target);

// Handler receives the typed payload directly:
const sub = listen.on("message", (value) => {
  console.log(value.text); // string
  console.log(value.from); // string
});

emit.emit("message", { text: "hello", from: "server" });

// Unsubscribe when done:
sub.stop();
```

#### Multiple Independent Subscriptions

```typescript
const target = new EventTarget();
const listen = listener<{ data: string }>(target);

const sub1 = listen.on("data", (v) => console.log("A:", v));
const sub2 = listen.on("data", (v) => console.log("B:", v));

// Stop one without affecting the other:
sub1.stop();
```

---

### `messagePort`

```typescript
import { emitter, listener } from "@thuum/event-emitter/message-port";
```

Adapts `BroadcastChannel`, `MessagePort`, `Worker`, or `Window`. Events are sent as `{ name, value }` objects via `postMessage` and filtered by name on the receiving side.

#### Cross-Tab Communication

```typescript
import { emitter, listener } from "@thuum/event-emitter/message-port";

type Events = {
  "user:login": { id: string; role: string };
  "user:logout": { id: string };
};

// In Tab A — send events:
const channel = new BroadcastChannel("auth");
const emit = emitter<Events>(channel);

emit.emit("user:login", { id: "abc", role: "admin" });
```

```typescript
// In Tab B — receive events:
const channel = new BroadcastChannel("auth");
const listen = listener<Events>(channel);

const sub = listen.on("user:login", (payload) => {
  console.log(payload.id);   // "abc"
  console.log(payload.role); // "admin"
});

// Cleanup:
sub.stop();
```

#### Worker Communication

```typescript
import { emitter, listener } from "@thuum/event-emitter/message-port";

type WorkerEvents = {
  "task:start": { taskId: string };
  "task:done": { taskId: string; result: unknown };
};

// Main thread → Worker
const worker = new Worker("./worker.js");
const emit = emitter<WorkerEvents>(worker);

emit.emit("task:start", { taskId: "t1" });

// Worker → Main thread (inside worker.js)
const listen = listener<WorkerEvents>(self);
listen.on("task:start", (task) => {
  // process task...
});
```

---

### `nodeEvents`

```typescript
import { emitter, listener } from "@thuum/event-emitter/node-events";
```

Wraps a Node.js `EventEmitter` with type-safe `emit` and `on` methods.

#### Basic Usage

```typescript
import { EventEmitter } from "node:events";
import { emitter, listener } from "@thuum/event-emitter/node-events";

type Events = { message: string; error: Error };

const ee = new EventEmitter();
const emit = emitter<Events>(ee);
const listen = listener<Events>(ee);

const sub = listen.on("message", (msg) => {
  console.log(msg); // typed as string
});

emit.emit("message", "hello");

// Unsubscribe:
sub.stop();
```

#### Multiple Event Types

```typescript
import { EventEmitter } from "node:events";
import { emitter, listener } from "@thuum/event-emitter/node-events";

type Events = {
  request: { method: string; url: string };
  response: { status: number; body: string };
  error: Error;
};

const bus = new EventEmitter();
const emit = emitter<Events>(bus);
const listen = listener<Events>(bus);

listen.on("request", (req) => {
  console.log(`${req.method} ${req.url}`);
});

listen.on("error", (err) => {
  console.error(err.message);
});

emit.emit("request", { method: "GET", url: "/api/users" });
emit.emit("error", new Error("timeout"));
```

---

### `rxjs`

```typescript
import { emitter, listener } from "@thuum/event-emitter/rxjs";
```

Multiplexes typed events as `{ name, value }` objects through a single RxJS-compatible `Subject`. Useful for reactive pipelines where multiple event types share one stream.

#### Basic Usage

```typescript
import { Subject } from "rxjs";
import { emitter, listener } from "@thuum/event-emitter/rxjs";
import type { EventUnion } from "@thuum/event-emitter";

type Events = {
  message: string;
  disconnect: { reason: string };
};

const subject = new Subject<EventUnion<Events>>();
const emit = emitter<Events>(subject);
const listen = listener<Events>(subject);

const sub = listen.on("message", (text) => {
  console.log("received:", text);
});

emit.emit("message", "hello");

// Unsubscribe (calls subscription.unsubscribe() internally):
sub.stop();
```

#### Filtering by Event Name

```typescript
import { Subject } from "rxjs";
import { emitter, listener } from "@thuum/event-emitter/rxjs";
import type { EventUnion } from "@thuum/event-emitter";

type Events = { ping: undefined; pong: undefined };

const subject = new Subject<EventUnion<Events>>();
const emit = emitter<Events>(subject);
const listen = listener<Events>(subject);

// Only fires for "pong" events:
listen.on("pong", () => {
  console.log("pong received");
});

emit.emit("ping", undefined); // handler not called
emit.emit("pong", undefined); // logs: "pong received"
```

---

### `connect(source, sink, ...names)`

Bridges a listener (source) to an emitter (sink), forwarding all specified events from one side to the other.

```typescript
import { connect } from "@thuum/event-emitter";
```

#### Forward Events Between Targets

```typescript
import { connect } from "@thuum/event-emitter";
import { emitter, listener } from "@thuum/event-emitter/event-target";

type Events = {
  message: { text: string };
  error: { code: number };
};

const source = new EventTarget();
const dest = new EventTarget();

const connection = connect(
  listener<Events>(source),
  emitter<Events>(dest),
  "message", "error",
);

// Events dispatched on `source` are now forwarded to `dest`.
// Stop forwarding:
connection.stop();
```

#### Bidirectional Bridge

```typescript
import { connect } from "@thuum/event-emitter";
import { emitter, listener } from "@thuum/event-emitter/event-target";

type Events = { ping: undefined; pong: undefined };

const a = new EventTarget();
const b = new EventTarget();

// Wire A → B and B → A:
const ab = connect(listener<Events>(a), emitter<Events>(b), "ping");
const ba = connect(listener<Events>(b), emitter<Events>(a), "pong");

// Cleanup both directions:
ab.stop();
ba.stop();
```

#### Cross-Transport Bridging

Because all adapters share the same `Emitter`/`Listener` interfaces, you can bridge different transports:

```typescript
import { connect } from "@thuum/event-emitter";
import { listener } from "@thuum/event-emitter/node-events";
import { emitter } from "@thuum/event-emitter/message-port";
import { EventEmitter } from "node:events";

type Events = { update: { id: string; data: unknown } };

const ee = new EventEmitter();
const channel = new BroadcastChannel("updates");

// Forward Node.js events → BroadcastChannel:
const bridge = connect(
  listener<Events>(ee),
  emitter<Events>(channel),
  "update",
);

bridge.stop();
```

---

## Patterns

### Selective Forwarding

Only forward a subset of events between systems:

```typescript
import { connect } from "@thuum/event-emitter";
import { emitter, listener } from "@thuum/event-emitter/event-target";

type Events = {
  mousedown: { x: number; y: number };
  mousemove: { x: number; y: number };
  mouseup: { x: number; y: number };
};

const input = new EventTarget();
const renderer = new EventTarget();

// Only forward mousedown and mouseup, skip the noisy mousemove:
connect(
  listener<Events>(input),
  emitter<Events>(renderer),
  "mousedown", "mouseup",
);
```

### Shared Event Bus

Create a centralized, type-safe event bus:

```typescript
import { emitter, listener } from "@thuum/event-emitter/event-target";

type AppEvents = {
  "auth:login": { userId: string };
  "auth:logout": undefined;
  "nav:change": { route: string };
  "theme:toggle": undefined;
};

const bus = new EventTarget();

export const publish = emitter<AppEvents>(bus);
export const subscribe = listener<AppEvents>(bus);
```

```typescript
// In any module:
import { publish, subscribe } from "./event-bus";

subscribe.on("auth:login", ({ userId }) => {
  console.log(`User ${userId} logged in`);
});

publish.emit("auth:login", { userId: "user-42" });
```

### Transport-Agnostic Modules

Write modules that accept the abstract interfaces, making them testable and transport-independent:

```typescript
import type { Emitter, Listener } from "@thuum/event-emitter";

type NotificationEvents = {
  notify: { title: string; body: string };
  dismiss: { id: string };
};

function createNotificationService(
  emit: Emitter<NotificationEvents>,
  listen: Listener<NotificationEvents>,
) {
  listen.on("dismiss", ({ id }) => {
    console.log(`Dismissed notification ${id}`);
  });

  return {
    show(title: string, body: string) {
      emit.emit("notify", { title, body });
    },
  };
}
```

---

## Sub-path Exports

| Path | Contents |
|------|----------|
| `@thuum/event-emitter` | Core types + `connect` + all adapter namespaces |
| `@thuum/event-emitter/event-target` | `emitter`, `listener` for DOM EventTarget |
| `@thuum/event-emitter/message-port` | `emitter`, `listener` for MessagePort/BroadcastChannel |
| `@thuum/event-emitter/node-events` | `emitter`, `listener` for Node.js EventEmitter |
| `@thuum/event-emitter/rxjs` | `emitter`, `listener` for RxJS Subject/Observable |

## License

ISC
