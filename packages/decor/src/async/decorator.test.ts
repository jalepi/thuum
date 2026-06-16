import { describe, expect, it, vi } from "bun:test";
import { decorator } from "./decorator";

describe("decorator async tests", () => {
  it("should decorator not throw", () => {
    const spy = vi.fn(() => Promise.resolve());

    const bypass = decorator(async (fn, ...args: unknown[]) => await fn(...args));
    const decorated = bypass(spy);

    expect(decorated()).resolves.toBeUndefined();
  });

  it("should decorator receive args", async () => {
    const spy = vi.fn();
    async function test(_a: number, _b: string, _c: boolean) {
      await Promise.resolve();
    }

    const bypass = decorator(async (fn, ...args: unknown[]) => {
      spy(...args);
      return await fn(...args);
    });
    const decorated = bypass(test);
    await decorated(1, "foo", true);

    expect(spy).toHaveBeenCalledWith(1, "foo", true);
  });

  it("should decorator return", async () => {
    const spy = vi.fn();
    async function test() {
      return Promise.resolve(1);
    }

    const bypass = decorator(async (fn, ...args: unknown[]) => {
      const r = await fn(...args);
      spy(r);
      return r;
    });
    const decorated = bypass(test);

    await decorated();
    expect(spy).toHaveBeenCalledWith(1);
  });

  it("should decorator binds this", async () => {
    const spy = vi.fn();
    async function test(this: unknown) {
      spy(this);
      return Promise.resolve();
    }

    const bypass = decorator(async (fn, ...args: unknown[]) => await fn(...args));
    const obj = { test: bypass(test) };

    await obj.test();
    expect(spy).toHaveBeenCalledWith(obj);
  });

  it("should decorator substitute args", async () => {
    const spy = vi.fn();
    async function test(a: number, b: string, c: boolean) {
      spy(a, b, c);
      return Promise.resolve();
    }

    const modifyArgs = decorator(async (fn, a: number, b: string, c: boolean) => await fn(a + 1, b + "1", !c));
    const decorated = modifyArgs(test);
    await decorated(1, "foo", true);

    expect(spy).toHaveBeenCalledWith(1 + 1, "foo" + "1", !true);
  });

  it("should decorator substitute return", async () => {
    const spy = vi.fn();
    async function test() {
      spy();
      return Promise.resolve(1);
    }

    const modifyReturn = decorator(async (fn, ...args: unknown[]) => ((await fn(...args)) as number) + 1);
    const decorated = modifyReturn(test);

    expect(await decorated()).toBe(1 + 1);
    expect(spy).toHaveBeenCalled();
  });

  it("should decorator short circuit", async () => {
    const spy = vi.fn();
    function test() {
      spy();
      return Promise.resolve(1);
    }

    const shortCircuit = decorator(async (_fn, ..._args: unknown[]) => {
      await Promise.resolve();
      // noop
    });
    const decorated = shortCircuit(test);

    expect(await decorated()).toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
  });

  it("should decorator handle rejection", () => {
    const error = new Error("async failure");
    function test() {
      return Promise.reject(error);
    }

    const bypass = decorator(async (fn, ...args: unknown[]) => await fn(...args));
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
