export type PromiseResolver<T> = Readonly<{
  /** Resolves the promise */
  resolve(this: void, value: T): void;

  /** Rejects the promise. */
  reject(this: void, reason: unknown): void;

  /** Promise object */
  promise: Promise<T>;
}>;

/**
 * Provides Promise features until widely available https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers
 * Creates a promise and its resolve and reject functions separately
 * @returns Promise resolver
 * @example
 * ```ts
 * // using promise constructor
 * async function delay(ms: number): Promise<void> {
 *   return new Promise((res) => setTimeout(res, ms));
 * }
 *
 * // using withResolvers
 * import * as PromiseNext from "./with-resolvers";
 *
 * async function delay(ms: number): Promise<void> {
 *   const { promise, resolve } = PromiseNext.withResolvers<number>();
 *   setTimeout(resolve, ms);
 *   return await promise;
 * }
 * ```
 */
const withResolvers = <T = void>(): PromiseResolver<T> => {
  let resolve: (v: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { resolve, reject, promise };
};

export default withResolvers;
