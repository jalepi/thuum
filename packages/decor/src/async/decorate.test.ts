import { describe, expect, it, vi } from "bun:test";
import { decorate } from "./decorate";

describe("decorate async tests", () => {
  it("should decorate not throw", () => {
    const spy = vi.fn(() => Promise.resolve());

    const bypass = decorate(async (fn, ...args: unknown[]) => await fn(...args));
    const decorated = bypass(spy);

    expect(decorated()).resolves.toBeUndefined();
  });

  it("should decorate receive args", async () => {
    const spy = vi.fn();
    async function test(_a: number, _b: string, _c: boolean) {
      await Promise.resolve();
    }

    const bypass = decorate(async (fn, ...args: unknown[]) => {
      spy(...args);
      return await fn(...args);
    });
    const decorated = bypass(test);
    await decorated(1, "foo", true);

    expect(spy).toHaveBeenCalledWith(1, "foo", true);
  });

  it("should decorate return", async () => {
    const spy = vi.fn();
    async function test() {
      return Promise.resolve(1);
    }

    const bypass = decorate(async (fn, ...args: unknown[]) => {
      const r = await fn(...args);
      spy(r);
      return r;
    });
    const decorated = bypass(test);

    await decorated();
    expect(spy).toHaveBeenCalledWith(1);
  });

  it("should decorate binds this", async () => {
    const spy = vi.fn();
    async function test(this: unknown) {
      spy(this);
      return Promise.resolve();
    }

    const bypass = decorate(async (fn, ...args: unknown[]) => await fn(...args));
    const obj = { test: bypass(test) };

    await obj.test();
    expect(spy).toHaveBeenCalledWith(obj);
  });

  it("should decorate substitute args", async () => {
    const spy = vi.fn();
    async function test(a: number, b: string, c: boolean) {
      spy(a, b, c);
      return Promise.resolve();
    }

    const modifyArgs = decorate(async (fn, a: number, b: string, c: boolean) => await fn(a + 1, b + "1", !c));
    const decorated = modifyArgs(test);
    await decorated(1, "foo", true);

    expect(spy).toHaveBeenCalledWith(1 + 1, "foo" + "1", !true);
  });

  it("should decorate substitute return", async () => {
    const spy = vi.fn();
    async function test() {
      spy();
      return Promise.resolve(1);
    }

    const modifyReturn = decorate(async (fn, ...args: unknown[]) => ((await fn(...args)) as number) + 1);
    const decorated = modifyReturn(test);

    expect(await decorated()).toBe(1 + 1);
    expect(spy).toHaveBeenCalled();
  });

  it("should decorate short circuit", async () => {
    const spy = vi.fn();
    function test() {
      spy();
      return Promise.resolve(1);
    }

    const shortCircuit = decorate(async (_fn, ..._args: unknown[]) => {
      await Promise.resolve();
      // noop
    });
    const decorated = shortCircuit(test);

    expect(await decorated()).toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
  });

  it("should decorate handle rejection", () => {
    const error = new Error("async failure");
    function test() {
      return Promise.reject(error);
    }

    const bypass = decorate(async (fn, ...args: unknown[]) => await fn(...args));
    const decorated = bypass(test);

    expect(decorated()).rejects.toThrow(error);
  });

  it("PROMISE", () => {
    const promise = new Promise<number>((r) =>
      setTimeout(() => {
        r(1);
      }, 500),
    );
    expect(promise).resolves.toBe(1);
  });
});
