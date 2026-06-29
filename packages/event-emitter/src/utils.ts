/**
 * Freezes an object, preventing new properties from being added and existing properties from being modified or deleted.
 *
 * @template T - The type of the value to freeze.
 * @param value - The object to freeze.
 * @returns The same object, now frozen.
 *
 * @example
 * ```ts
 * const config = freeze({ host: "localhost", port: 3000 });
 * // config.port = 8080; // Error: Cannot assign to 'port' because it is a read-only property
 * ```
 *
 * @example
 * ```ts
 * const items = freeze([1, 2, 3]);
 * // items.push(4); // Error: Object is frozen
 * ```
 */
export const freeze: <const T>(value: T) => T = (value) => Object.freeze(value);
