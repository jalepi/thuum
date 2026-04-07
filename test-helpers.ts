/**
 * Shared test utilities that replace Vitest-specific APIs not available in bun:test.
 */

const TIMEOUT = 1000; // Default timeout for waitFor and waitUntil
const INTERVAL = 10; // Default interval for waitFor and waitUntil

/**
 * Simple sleep function to wait for a specified number of milliseconds.
 * @param ms - The number of milliseconds to wait.
 * @returns A promise that resolves after the specified number of milliseconds.
 */
export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Waits for a function to complete without throwing an error, retrying until the timeout is reached.
 * @param fn - The function to wait for.
 * @param options - Optional settings for timeout and interval.
 * @returns A promise that resolves when the function completes successfully or rejects if the timeout is reached.
 */
export async function waitFor(
  fn: () => void | Promise<void>,
  { timeout = TIMEOUT, interval = INTERVAL }: { timeout?: number; interval?: number } = {},
): Promise<void> {
  const deadline = Date.now() + timeout;
  let lastError: unknown = new Error("waitFor timed out");

  while (Date.now() < deadline) {
    const remaining = deadline - Date.now();
    try {
      await Promise.race([fn(), wait(remaining).then(() => Promise.reject(new Error("waitFor timed out")))]);
      return;
    } catch (e) {
      lastError = e;
    }
    await wait(Math.min(interval, deadline - Date.now()));
  }

  throw lastError;
}

/**
 * Waits for a function to return a truthy value, retrying until the timeout is reached.
 * @param fn - The function to wait for.
 * @param options - Optional settings for timeout and interval.
 * @returns A promise that resolves with the truthy value returned by the function or rejects if the timeout is reached.
 */
export async function waitUntil<T>(
  fn: () => T | Promise<T>,
  { timeout = TIMEOUT, interval = INTERVAL }: { timeout?: number; interval?: number } = {},
): Promise<T> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const remaining = deadline - Date.now();
    const result = await Promise.race([fn(), wait(remaining).then(() => undefined as T)]);
    if (result) {
      return result;
    }
    await wait(Math.min(interval, deadline - Date.now()));
  }
  throw new Error("waitUntil timed out");
}
