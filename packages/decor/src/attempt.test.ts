import { describe, it, expect, assert } from "vitest";
import { attempt } from "./attempt";

describe("attempt decorator tests", () => {
  it("should attempt to succeed a function call", () => {
    const fn = () => {
      return "ok";
    };
    const decor = attempt(fn);

    const result = decor();

    assert(!("error" in result));
    assert("value" in result);
    expect(result.value).toBe("ok");
  });

  it("should attempt to fail a function call", () => {
    const err = new Error("test");
    const fn = () => {
      throw err;
    };
    const decor = attempt(fn);

    const result = decor();
    assert(!("value" in result));
    assert("error" in result);
    expect(result.error).toBe(err);
  });
});
