export function uniqueId(): string {
  const time = performance.timeOrigin + performance.now();
  const random = Math.random();
  return time.toString(36).replace(".", "") + random.toString(36).replace(".", "");
}
