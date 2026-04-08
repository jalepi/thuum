---
title: Getting Started
description: How to install and use Thuum packages.
---

## Prerequisites

- Node.js v18 or higher
- A package manager: npm, bun, yarn, or pnpm

## Installation

Each package is published independently under the `@thuum` scope. Install only the packages you need:

```bash
# npm
npm install @thuum/piper
npm install @thuum/decor
npm install @thuum/promising
npm install @thuum/transport
npm install @thuum/channels @thuum/transport

# bun
bun add @thuum/piper
```

:::note
`@thuum/channels` requires `@thuum/transport` as a peer dependency.
:::

## Quick Examples

### Pipe a value through transformations

```typescript
import { pipe } from "@thuum/piper";

const { value } = pipe(1)
  .pipe((x) => x + 1)
  .pipe((x) => x * 2);

console.log(value); // 4
```

### Safe error handling

```typescript
import { attempt } from "@thuum/decor";

const safeParse = attempt(JSON.parse);
const result = safeParse("invalid json");

if ("error" in result) {
  console.error("Parse failed:", result.error);
} else {
  console.log("Parsed:", result.value);
}
```

### Sequential async execution

```typescript
import { createContext } from "@thuum/promising";

const ctx = createContext({
  watch: (event) => console.log(`[${event.type}] ${event.name}`),
});

ctx.run("first", async () => await fetchFirst());
ctx.run("second", async () => await fetchSecond());
// "second" always waits for "first" to complete
```

### Message channels

```typescript
import { createMessageChannel } from "@thuum/channels";
import { createTransport } from "@thuum/transport";

const channel = createMessageChannel({
  schemas: {
    greeting: { message: { parse: (data) => ({ value: data }) } },
  },
  transport: createTransport({ type: "window-custom-event", namespace: "app" }),
});

channel.receiver.on("greeting", {
  ondata: ({ value }) => console.log(value),
});

channel.sender.send("greeting", { text: "Hello!" });
```

## Development

To work on the Thuum monorepo itself:

```bash
git clone https://github.com/jalepi/thuum.git
cd thuum
bun install
bun run build
bun run test
```
