import { describe, it, expect } from "bun:test";
import { waitFor } from "../../../test-helpers";
import withResolvers from "./with-resolvers";

describe("PromiseNext tests", () => {
  it("should instantiate a promise resolver", () => {
    const { promise, resolve, reject } = withResolvers();
    expect(promise).toBeInstanceOf(Promise);
    expect(resolve).toBeInstanceOf(Function);
    expect(reject).toBeInstanceOf(Function);
  });

  it("should initial promise be pending", () => {
    const { promise } = withResolvers();

    expect(
      waitFor(async () => {
        await promise;
      }),
    ).rejects.toThrow();
  });

  it("should resolve a promise", () => {
    const { promise, resolve } = withResolvers<number>();

    resolve(42);

    expect(promise).resolves.toBe(42);
  });

  it("should reject a promise", () => {
    const { promise, reject } = withResolvers<number>();
    const reason = new Error("problem");

    reject(reason);

    expect(promise).rejects.toThrow(reason);
  });

  it("should not reject a resolved promise", () => {
    const { promise, resolve, reject } = withResolvers<number>();
    resolve(42);
    expect(promise).resolves.toBe(42);

    reject(new Error("problem"));
    expect(promise).resolves.toBe(42);
  });

  it("should not resolve a rejected promise", () => {
    const { promise, resolve, reject } = withResolvers<number>();
    reject(new Error("problem"));
    expect(promise).rejects.toThrow();

    resolve(42);
    expect(promise).rejects.toThrow();
  });

  it("should not affect a settled promise", () => {
    const { promise, resolve, reject } = withResolvers<number>();
    resolve(42);
    reject(new Error());
    resolve(69);
    reject(new Error());

    expect(promise).resolves.toBe(42);
  });

  it("should resolve to undefined accepting zero arguments for void", () => {
    const { promise, resolve } = withResolvers();
    resolve();

    expect(promise).resolves.toBe(undefined);
  });
});
