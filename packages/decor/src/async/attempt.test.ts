import { describe, it, expect } from "vitest";
import { attempt } from "./attempt";

describe("", () => {
  it("should attempt to succeed a function call", async () => {
    const fn = () => Promise.resolve("ok");
    const decor = attempt(fn);

    const [error, value] = await decor();

    expect(error).toBe(undefined);
    expect(value).toBe("ok");
  });

  it("should attempt to fail a function call", async () => {
    const err = new Error("test");
    const fn = () => Promise.reject(err);
    const decor = attempt(fn);

    const [error, value] = await decor();

    expect(error).toBe(err);
    expect(value).toBe(undefined);
  });
});
