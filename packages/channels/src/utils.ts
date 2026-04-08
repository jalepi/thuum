/**
 * Generates a unique identifier string based on high-resolution time and a random component.
 * @returns A unique string suitable for correlating request/response pairs
 */
export function uniqueId(): string {
  const time = performance.timeOrigin + performance.now();
  const random = Math.random();
  return time.toString(36).replace(".", "") + random.toString(36).replace(".", "");
}
