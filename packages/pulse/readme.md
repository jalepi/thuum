Pulse is a microlibrary for decoupled communication.
It is simple event listener/emitter - much like EventTarget.

Pulse is design with pillars in mind:

- Type safety over Standard Schema - validation agnostic, bring your own validation library, Zod, Valibot, etc.
- Best Developer Experience (DX) possible, fool-proof interface, auto-complete, jsdocs with examples, hints, sourcemaps, etc.
- Without boundaries, works within the same Browser Context or across the Network, backend or frontend.

Pulse consists on:

### Message
anemic object with topic of string and data of unknown.
```ts
export interface Message<Topic extends string = string, Data = unknown> {
  readonly topic: Topic;
  readonly data: Data;
};
```

### Transport
sends and receives messages.
```ts
import type { MaybePromise, Message } from "@thuum/pulse";

export interface Transport {
  send(topic: string, data: unknown): MaybePromise;
  receive(topic: string, handler: (message: Message) => MaybePromise): { 
    close(): void;
  };
}
```

### Emitter
validates messages with **schemas** and emits them to **transport**.
```ts
import type { SchemaLike, MaybePromise, MaybeError } from "@thuum/pulse";

export type Emitter<Schemas extends SchemaLike> = {
  emit<Topic extends keyof Schemas>(topic: Topic, payload: Schemas[Topic]): MaybePromise<MaybeError>;
}
```

### Listener
receives messages from **transport** and validates them with **schemas**.
```ts
import type { Message, MaybePromise } from "@thuum/pulse";

type Handlers<Schemas extends SchemaLike> = {
  [Topic extends keyof Schemas]: {
    ondata({ topic, data }: Message<Topic, Schemas[Topic]>): MaybePromise;
    onerror?({ error, trace }: Failure): MaybePromise;
  }
}

export type Listener<Schemas extends SchemaLike> = {
  listen<Topic extends keyof Schemas>(handlers: Handlers<Schemas>): { 
    unsubscribe(): void; 
  };
}
```

```ts
// ./schemas.ts
import { z } from "zod";
import type { SchemaLike } from "@thuum/pulse";

export const schemas = {
  foo: z.object({ value: z.string() }),
  bar: z.object({ value: z.number() }),
} satisfies SchemaLike;
````

```ts
// ./transports.ts
import type { Transport } from "@thuum/pulse";

export function broadcastChannelTransport(channel: BroadcastChannel): Transport {
  return {
    send(type, data) {
      channel.postMessage({ type, data });
    },
    receive(type, handler) {
      const listener = ({ data }: MessageEvent) => {
        handler({ type, data });
      };
      channel.addEventListener("message", listener);
      return () => {
        channel.removeEventListener("message", listener);
      }
    },
  }
}
````

```ts
// ./schema-channel.ts
import { emitter, listener } from "@thuum/pulse";
import type { Emitter, Listener, InferSchema } from "@thuum/pulse";
import { schemas } from "./schemas";
import { broadcastChannelTransport } from "./transports";

type SchemaChannel = Emitter<typeof schemas> & Listener<typeof schemas>;

const schemaChannel = (name: string): SchemaChannel => {
  const broadcastChannel = new BroadcastChannel(name);
  const transport = broadcastChannelTransport(broadcastChannel);

  return {
    emitter: emitter({ schemas, transport }),
    listener: listener({ schemas, transport }),
  };
}
```

```ts
// emitting
import { schemaChannel } from "./schema-channel";

const defaultChannel = schemaChannel("default");

const { success, error } = await defaultChannel.emit("foo", { 
  value: "string value",
});

if (success) {
  console.log("message was sent!");
} else {
  console.error("failed to send message: ", error);
}
```

```ts
// listening
import { schemaChannel } from "./schema-channel";

const defaultChannel = schemaChannel("default");

// subscribe to a single event type
const subscription = defaultChannel.listen("foo", {
  ondata({ value }) {
    console.log("received foo: ", data);
  },
  onerror({ error, trace }) {
    console.error("failed to receive foo: ", error, trace);
  },
});

// subscribe to multiple event types
const subscription = defaultChannel.listen({
  foo: { 
    ondata({ value }) {
      console.log("received foo: ", value);
    },
    onerror({ error, trace }) {
      console.error("failed to receive foo: ", error, trace);
    },
  },
  bar: { 
    async ondata({ value }) {
      console.log("received bar: ", value);
      // handlers can be asynchronous
      await longProcessCall();
    },
    // onerror is optional.
  },
})

// unsubscribe
subscription.unsubscribe();
```
