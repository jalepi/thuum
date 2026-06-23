import { describe, expect, it, vi } from "bun:test";
import { decorator } from "./decorator";

describe("decorator tests", () => {
  it("should decorator not throw", () => {
    const spy = vi.fn();

    const bypass = decorator((fn, ...args: unknown[]) => fn(...args));
    const decorated = bypass(spy);

    expect(decorated).not.toThrow();
  });

  it("should decorator receive args", () => {
    const spy = vi.fn();
    function test(_a: number, _b: string, _c: boolean) {
      //
    }

    const bypass = decorator((fn, ...args: unknown[]) => {
      spy(...args);
      fn(...args);
    });
    const decorated = bypass(test);
    decorated(1, "foo", true);

    expect(spy).toHaveBeenCalledWith(1, "foo", true);
  });

  it("should decorator return", () => {
    const spy = vi.fn();
    function test() {
      return 1;
    }

    const bypass = decorator((fn, ...args: unknown[]) => {
      const r = fn(...args);
      spy(r);
      return r;
    });
    const decorated = bypass(test);

    decorated();
    expect(spy).toHaveBeenCalledWith(1);
  });

  it("should decorator binds this", () => {
    const spy = vi.fn();
    function test(this: unknown) {
      spy(this);
    }

    const bypass = decorator((fn, ...args: unknown[]) => fn(...args));
    const obj = { test: bypass(test) };

    obj.test();
    expect(spy).toHaveBeenCalledWith(obj);
  });

  it("should decorator substitute args", () => {
    const spy = vi.fn();
    function test(a: number, b: string, c: boolean) {
      spy(a, b, c);
    }

    const modifyArgs = decorator((fn, a: number, b: string, c: boolean) => fn(a + 1, b + "1", !c));
    const decorated = modifyArgs(test);
    decorated(1, "foo", true);

    expect(spy).toHaveBeenCalledWith(1 + 1, "foo" + "1", !true);
  });

  it("should decorator substitute return", () => {
    const spy = vi.fn();
    function test() {
      spy();
      return 1;
    }

    const modifyReturn = decorator((fn, ...args: unknown[]) => (fn(...args) as number) + 1);
    const decorated = modifyReturn(test);

    expect(decorated()).toBe(1 + 1);
    expect(spy).toHaveBeenCalled();
  });

  it("should decorator short circuit", () => {
    const spy = vi.fn();
    function test() {
      spy();
      return 1;
    }

    const shortCircuit = decorator((_fn, ..._args: unknown[]) => {
      return undefined as unknown as number;
    });
    const decorated = shortCircuit(test);

    expect(decorated()).toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
  });
});
