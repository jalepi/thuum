import { describe, it, expect, vi } from "vitest";
import withResolvers from "./with-resolvers";

describe("PromiseNext tests", () => {
  it("should instantiate a promise resolver", () => {
    const { promise, resolve, reject } = withResolvers();
    expect(promise).toBeInstanceOf(Promise);
    expect(resolve).toBeInstanceOf(Function);
    expect(reject).toBeInstanceOf(Function);
  });

  it("should initial promise be pending", async () => {
    const { promise } = withResolvers();

    await expect(async () => {
      await vi.waitFor(async () => {
        await promise;
      });
    }).rejects.toThrow();
  });

  it("should resolve a promise", async () => {
    const { promise, resolve } = withResolvers<number>();

    resolve(42);

    await expect(promise).resolves.toBe(42);
  });

  it("should reject a promise", async () => {
    const { promise, reject } = withResolvers<number>();
    const reason = new Error("problem");

    reject(reason);

    await expect(promise).rejects.toThrow(reason);
  });

  it("should not reject a resolved promise", async () => {
    const { promise, resolve, reject } = withResolvers<number>();
    resolve(42);
    await expect(promise).resolves.toBe(42);

    reject(new Error("problem"));
    await expect(promise).resolves.toBe(42);
  });

  it("should not resolve a rejected promise", async () => {
    const { promise, resolve, reject } = withResolvers<number>();
    reject(new Error("problem"));
    await expect(promise).rejects.toThrow();

    resolve(42);
    await expect(promise).rejects.toThrow();
  });

  it("should not affect a settled promise", async () => {
    const { promise, resolve, reject } = withResolvers<number>();
    resolve(42);
    reject(new Error());
    resolve(69);
    reject(new Error());

    await expect(promise).resolves.toBe(42);
  });

  it("should resolve to undefined accepting zero arguments for void", async () => {
    const { promise, resolve } = withResolvers();
    resolve();

    await expect(promise).resolves.toBe(undefined);
  });
});
