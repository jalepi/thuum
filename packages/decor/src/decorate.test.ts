import { describe, expect, it, vi } from "bun:test";
import { decorate } from "./decorate";

describe("decorate tests", () => {
  it("should decorate not throw", () => {
    const spy = vi.fn();

    const bypass = decorate((fn, ...args: unknown[]) => fn(...args));
    const decorated = bypass(spy);

    expect(decorated).not.toThrow();
  });

  it("should decorate receive args", () => {
    const spy = vi.fn();
    function test(_a: number, _b: string, _c: boolean) {
      //
    }

    const bypass = decorate((fn, ...args: unknown[]) => {
      spy(...args);
      fn(...args);
    });
    const decorated = bypass(test);
    decorated(1, "foo", true);

    expect(spy).toHaveBeenCalledWith(1, "foo", true);
  });

  it("should decorate return", () => {
    const spy = vi.fn();
    function test() {
      return 1;
    }

    const bypass = decorate((fn, ...args: unknown[]) => {
      const r = fn(...args);
      spy(r);
      return r;
    });
    const decorated = bypass(test);

    decorated();
    expect(spy).toHaveBeenCalledWith(1);
  });

  it("should decorate binds this", () => {
    const spy = vi.fn();
    function test(this: unknown) {
      spy(this);
    }

    const bypass = decorate((fn, ...args: unknown[]) => fn(...args));
    const obj = { test: bypass(test) };

    obj.test();
    expect(spy).toHaveBeenCalledWith(obj);
  });

  it("should decorate substitute args", () => {
    const spy = vi.fn();
    function test(a: number, b: string, c: boolean) {
      spy(a, b, c);
    }

    const modifyArgs = decorate((fn, a: number, b: string, c: boolean) => fn(a + 1, b + "1", !c));
    const decorated = modifyArgs(test);
    decorated(1, "foo", true);

    expect(spy).toHaveBeenCalledWith(1 + 1, "foo" + "1", !true);
  });

  it("should decorate substitute return", () => {
    const spy = vi.fn();
    function test() {
      spy();
      return 1;
    }

    const modifyReturn = decorate((fn, ...args: unknown[]) => (fn(...args) as number) + 1);
    const decorated = modifyReturn(test);

    expect(decorated()).toBe(1 + 1);
    expect(spy).toHaveBeenCalled();
  });

  it("should decorate short circuit", () => {
    const spy = vi.fn();
    function test() {
      spy();
      return 1;
    }

    const shortCircuit = decorate((_fn, ..._args: unknown[]) => {
      // noop
    });
    const decorated = shortCircuit(test);

    expect(decorated()).toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
  });
});
