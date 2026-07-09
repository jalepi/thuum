import { describe, expect, it } from "bun:test";
import { freeze } from "./utils";

describe("freeze", () => {
  it("should freeze an object, preventing property modification", () => {
    const config = freeze({ host: "localhost", port: 3000 });

    expect(config).toEqual({ host: "localhost", port: 3000 });
    expect(Object.isFrozen(config)).toBe(true);

    expect(() => {
      (config as { port: number }).port = 8080;
    }).toThrow();
  });

  it("should freeze an array, preventing mutations", () => {
    const items = freeze([1, 2, 3]);

    expect(items).toEqual([1, 2, 3]);
    expect(Object.isFrozen(items)).toBe(true);

    expect(() => {
      (items as unknown as number[]).push(4);
    }).toThrow();
  });

  it("should return the same reference", () => {
    const original = { a: 1 };
    const frozen = freeze(original);

    expect(frozen).toBe(original);
  });

  it("should prevent adding new properties", () => {
    const obj = freeze({ x: 10 });

    expect(() => {
      (obj as Record<string, unknown>).y = 20;
    }).toThrow();
  });

  it("should prevent deleting existing properties", () => {
    const obj = freeze({ x: 10 });

    expect(() => {
      delete (obj as Record<string, unknown>).x;
    }).toThrow();
  });
});
