# @thuum/promising

Promising utilities for working with JavaScript Promises, providing modern async patterns and enhanced control over asynchronous operations.

## Installation

```bash
npm install @thuum/promising
```

## Features

- **`withResolvers`**: A polyfill/implementation of the upcoming `Promise.withResolvers()` proposal, allowing you to create a promise with externally accessible resolve/reject functions
- **`createContext`**: An async execution context that ensures sequential execution of async operations with built-in monitoring capabilities

## API Reference

### `withResolvers<T>()`

Creates a promise along with its `resolve` and `reject` functions, making it easier to work with promises in scenarios where you need to control promise resolution from outside the promise constructor.

This is based on the [Promise.withResolvers()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers) proposal.

#### Returns

```typescript
{
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}
```

#### Example

```typescript
import { withResolvers } from '@thuum/promising';

// Traditional approach
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Using withResolvers
function delayWithResolvers(ms: number): Promise<void> {
  const { promise, resolve } = withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

// Useful for event-based patterns
class EventEmitter {
  waitForEvent(eventName: string) {
    const { promise, resolve } = withResolvers<any>();
    this.once(eventName, resolve);
    return promise;
  }
}

// Great for testing async flows
async function testAsyncOperation() {
  const { promise, resolve, reject } = withResolvers<number>();
  
  // Simulate async operation
  someAsyncOperation()
    .then(result => resolve(result))
    .catch(error => reject(error));
  
  return promise;
}
```

### `createContext(options)`

Creates an async execution context that manages sequential execution of async operations. This ensures tasks run in the order they were added, regardless of when they actually complete.

#### Parameters

- `options.watch?: (event: AsyncContextEvent) => void` - Optional callback to monitor task lifecycle events
- `options.id?: () => string` - Optional function to generate unique IDs (currently unused)

#### AsyncContextEvent Types

```typescript
type AsyncContextEvent = 
  | { type: 'waiting'; name: string; size: number; taskId: number }
  | { type: 'pending'; name: string; size: number; taskId: number }
  | { type: 'resolved'; name: string; size: number; taskId: number }
  | { type: 'rejected'; name: string; size: number; taskId: number }
```

#### Returns

```typescript
{
  run<Args, R>(
    name: string,
    fn: (...args: Args) => R | Promise<R>,
    ...args: Args
  ): Promise<R>;
  
  continuation: Promise<unknown>;
}
```

#### Example

```typescript
import { createContext, withResolvers } from '@thuum/promising';

// Create a context with monitoring
const ctx = createContext({
  watch(event) {
    console.log(`[${event.type}] ${event.name} (queue size: ${event.size})`);
  }
});

// Sequential execution example
const r1 = withResolvers<number>();
const r2 = withResolvers<number>();
const r3 = withResolvers<number>();

const p1 = ctx.run('task-1', () => r1.promise);
const p2 = ctx.run('task-2', () => r2.promise);
const p3 = ctx.run('task-3', () => r3.promise);

// Even if we resolve in reverse order...
r3.resolve(3);
r2.resolve(2);
r1.resolve(1);

// ...they still execute sequentially
await p1; // resolves with 1
await p2; // resolves with 2
await p3; // resolves with 3

// Real-world example: Sequential API calls
const apiContext = createContext({
  watch(event) {
    if (event.type === 'pending') {
      console.log(`Starting ${event.name}...`);
    }
  }
});

async function fetchUserData(userId: string) {
  return apiContext.run(`fetch-user-${userId}`, async () => {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
  });
}

async function updateUserData(userId: string, data: any) {
  return apiContext.run(`update-user-${userId}`, async () => {
    const response = await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return response.json();
  });
}

// These will execute in order, preventing race conditions
fetchUserData('123');
updateUserData('123', { name: 'John' });
fetchUserData('123'); // Will see updated data

// Error handling
try {
  await ctx.run('failing-task', async () => {
    throw new Error('Something went wrong');
  });
} catch (error) {
  console.error('Task failed:', error);
}

// Wait for all pending tasks
await apiContext.continuation;
```

## Use Cases

### `withResolvers`

- Converting callback-based APIs to promises
- Managing promise state in class instances
- Testing async code with manual control
- Implementing custom async patterns (queues, pools, etc.)
- Creating pausable/resumable async operations

### `createContext`

- Preventing race conditions in async operations
- Ensuring sequential database transactions
- Managing ordered API requests
- Implementing task queues with monitoring
- Coordinating complex async workflows
- Debugging async execution with lifecycle hooks

## TypeScript Support

This package is written in TypeScript and includes full type definitions. Both CommonJS and ESM formats are supported.

```typescript
import { withResolvers, createContext } from '@thuum/promising';
import type { AsyncContext, AsyncContextEvent, PromiseResolver } from '@thuum/promising';
```

## Browser Compatibility

This package works in all modern browsers and Node.js environments that support Promises and async/await.

## License

ISC

## Repository

[https://github.com/jalepi/thuum](https://github.com/jalepi/thuum)