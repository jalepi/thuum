/**
 * Shared test utilities that replace Vitest-specific APIs not available in bun:test.
 */
import { afterEach, it } from "bun:test";

// ---------------------------------------------------------------------------
// waitFor – polls fn until it stops throwing, or the timeout expires.
// Each iteration is also bounded by the remaining deadline so that a fn()
// that awaits a never-settling promise does not block the timeout from firing.
// Replaces vi.waitFor().
// ---------------------------------------------------------------------------
export async function waitFor(
  fn: () => void | Promise<void>,
  options?: { timeout?: number; interval?: number },
): Promise<void> {
  const timeout = options?.timeout ?? 1000;
  const interval = options?.interval ?? 10;
  const deadline = Date.now() + timeout;
  let lastError: unknown = new Error("waitFor timed out");

  while (true) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;

    // Race fn() against the remaining deadline so a hanging await doesn't block forever.
    const result = await new Promise<"done" | "retry">((resolve) => {
      Promise.resolve()
        .then(() => fn())
        .then(() => resolve("done"))
        .catch((e) => {
          lastError = e;
          resolve("retry");
        });
      setTimeout(() => resolve("retry"), remaining);
    });

    if (result === "done") return;

    const now = Date.now();
    if (now >= deadline) break;
    await new Promise((r) => setTimeout(r, Math.min(interval, deadline - now)));
  }

  throw lastError;
}

// ---------------------------------------------------------------------------
// waitUntil – polls fn until it returns a truthy value, or the timeout expires.
// Replaces vi.waitUntil().
// ---------------------------------------------------------------------------
export async function waitUntil<T>(
  fn: () => T | Promise<T>,
  options?: { timeout?: number; interval?: number },
): Promise<T> {
  const timeout = options?.timeout ?? 1000;
  const interval = options?.interval ?? 10;
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const result = await fn();
    if (result) return result;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error("waitUntil timed out");
}

// ---------------------------------------------------------------------------
// useCleanup – returns a register() helper and wires an afterEach teardown.
// Replaces the onTestFinished context parameter from Vitest.
//
// Usage (per describe block or file):
//   const register = useCleanup();
//   it("...", async () => {
//     register(someDisposable);   // function
//     register(() => obj.dispose()); // or factory
//   });
// ---------------------------------------------------------------------------
export function useCleanup(): (cleanup: (() => void) | (() => Promise<void>)) => void {
  const pending: Array<(() => void) | (() => Promise<void>)> = [];
  afterEach(async () => {
    const fns = pending.splice(0);
    for (const fn of fns) {
      await fn();
    }
  });
  return (cleanup) => {
    pending.push(cleanup);
  };
}

// ---------------------------------------------------------------------------
// itEach – typed wrapper around it.each that matches Vitest's it.for signature.
// Replaces it.for(array)(name, fn).
//
// Usage:
//   itEach([1, 2, 3])("value is %s", (value) => { ... });
//   itEach([{expected, input}])("case $expected", ({expected, input}) => { ... });
// ---------------------------------------------------------------------------
type AnyFn = (...args: never[]) => void | Promise<void>;

export function itEach<T>(cases: ReadonlyArray<T>): (name: string, fn: (value: T) => void | Promise<void>) => void {
  return (name, fn) => {
    for (const c of cases) {
      const title = formatTestName(name, c);
      it(title, () => fn(c));
    }
  };
}

function formatTestName(name: string, value: unknown): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return name.replace("%s", String(value)).replace("[%s]", `[${String(value)}]`);
  }
  if (value !== null && typeof value === "object") {
    let result = name;
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result = result.replace(new RegExp(`\\$${key}`, "g"), String(val));
      result = result.replace(new RegExp(`\\(\\$${key}\\)`, "g"), `(${String(val)})`);
    }
    return result;
  }
  return name;
}
