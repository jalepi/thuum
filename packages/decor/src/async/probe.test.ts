import { describe, it, expect, vi } from "vitest";
import { probe } from "./probe";
import type { Result } from "../types";

function createSubject() {
  const spies = { args: vi.fn(), ret: vi.fn() };
  const decor = probe(async (args) => {
    spies.args(args);
    await Promise.resolve();
    return async (result) => {
      await Promise.resolve();
      spies.ret(result);
    };
  });
  return { decor, ...spies };
}

const someValue = { value: expect.anything() as unknown };
const someError = { error: expect.anything() as unknown };

describe("probe async decorator tests", () => {
  it("should probe function arguments and success", async () => {
    const { decor, args, ret } = createSubject();
    const fn = decor((x: number) => Promise.resolve(x + 1));

    await expect(fn(2)).resolves.toBe(3);
    expect(args).toHaveBeenCalledWith([2]);
    expect(ret).toHaveBeenCalledWith({ value: 3 });
    expect(ret).not.toHaveBeenCalledWith(someError);
  });

  it("should probe function arguments and failure", async () => {
    const { decor, args, ret } = createSubject();
    const error = new Error("problem");
    const fn = decor((_x: number) => Promise.reject<number>(error));

    await expect(fn(2)).rejects.toThrow(error);
    expect(args).toHaveBeenCalledWith([2]);
    expect(ret).not.toHaveBeenCalledWith(someValue);
    expect(ret).toHaveBeenCalledWith({ error });
  });

  it("should probe without return", async () => {
    const spy = vi.fn();
    const decor = probe(async (args) => {
      spy(await Promise.resolve(args));
    });
    const fn = decor((x: number) => Promise.resolve(x + 1));

    await expect(fn(2)).resolves.toBe(3);
    expect(spy).toHaveBeenCalledWith([2]);
  });

  it("should probe modify arguments", async () => {
    const decor = probe(async (args: [a: number, b: number]) => {
      args[0] = await Promise.resolve(-args[0]);
      args[1] = await Promise.resolve(-args[1]);
      args.push(await Promise.resolve(42));
    });

    const spy = vi.fn(async (a: number, b: number) => await Promise.resolve(a + b));
    const add = decor(spy);

    await expect(add(1, 2)).resolves.toBe(-3);
    expect(spy).toHaveBeenCalledWith(-1, -2, 42);
  });

  it("should probe typed", async () => {
    interface A {
      foo: string;
    }
    interface B extends A {
      bar: string;
    }

    const spyArgs = vi.fn<(a: A) => void>();
    const spyResult = vi.fn<(result: Result<A>) => void>();
    const decor = probe(async ([a]: [a: A]) => {
      spyArgs(a);
      await Promise.resolve();
      return async (result: Result<A>) => {
        spyResult(result);
        await Promise.resolve();
      };
    });

    const fn1: (b: B) => Promise<B> = (b: B) => Promise.resolve(b);

    const fn2: (b: B) => Promise<B> = decor(fn1);

    const b = { foo: "foo1", bar: "bar1" };
    await expect(fn2(b)).resolves.toBe(b);

    expect(spyArgs).toHaveBeenCalledWith(b);
    expect(spyResult).toHaveBeenCalledWith({ value: b });
    expect(spyResult).not.toHaveBeenCalledWith(someError);
  });
});
