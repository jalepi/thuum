import { describe, it, expect } from "vitest";
import { attempt } from "./attempt";

describe("", () => {
  it("should attempt to succeed a function call", () => {
    const fn = () => {
      return "ok";
    };
    const decor = attempt(fn);

    const [error, value] = decor();

    expect(error).toBe(undefined);
    expect(value).toBe("ok");
  });

  it("should attempt to fail a function call", () => {
    const err = new Error("test");
    const fn = () => {
      throw err;
    };
    const decor = attempt(fn);

    const [error, value] = decor();

    expect(error).toBe(err);
    expect(value).toBe(undefined);
  });
});
