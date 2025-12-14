import { describe, it, expect, vi } from "vitest";
import createContext, { type AsyncContextEvent, type AsyncContextOptions } from "./async-context";

describe("async context tests", () => {
  it.for([1, Promise.resolve(1)] as const)("should await for it", async (r) => {
    const watch = vi.fn();
    const ctx = createContext({ watch });
    const p = ctx.run("", () => r);
    expect(await p).toBe(await r);
  });

  it("should run in sequence", async () => {
    // arrange
    const watch = vi.fn<NonNullable<AsyncContextOptions["watch"]>>();
    const ctx = createContext({ watch });
    const spy = vi.fn((e: unknown) => e);
    const [r1, r2, r3] = [withResolvers(), withResolvers(), withResolvers()];
    const [p1, p2, p3] = [
      ctx.run(`r1`, () => r1.promise.then(spy)),
      ctx.run(`r2`, () => r2.promise.then(spy)),
      ctx.run(`r3`, () => r3.promise.then(spy)),
    ];

    // act
    r3.resolve(3);
    r2.resolve(2);
    r1.resolve(1);

    // assert
    await vi.waitUntil(() => spy.mock.calls.length === 3);
    expect(spy.mock.calls).toMatchObject([[1], [2], [3]]);
    expect(await p1).toBe(1);
    expect(await p2).toBe(2);
    expect(await p3).toBe(3);
    expect(watch.mock.calls).toMatchObject([
      [{ type: "waiting", name: "r1", size: 1, taskId: 1 }],
      [{ type: "waiting", name: "r2", size: 2, taskId: 2 }],
      [{ type: "waiting", name: "r3", size: 3, taskId: 3 }],
      [{ type: "starting", name: "r1", size: 3, taskId: 1 }],
      [{ type: "completed", name: "r1", size: 2, taskId: 1 }],
      [{ type: "starting", name: "r2", size: 2, taskId: 2 }],
      [{ type: "completed", name: "r2", size: 1, taskId: 2 }],
      [{ type: "starting", name: "r3", size: 1, taskId: 3 }],
      [{ type: "completed", name: "r3", size: 0, taskId: 3 }],
    ] satisfies [AsyncContextEvent][]);
  });
});

function withResolvers<T>() {
  let resolve = (_value: T | PromiseLike<T>) => {
    /** */
  };
  let reject = (_reason: unknown) => {
    /** */
  };
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  }).then();

  return {
    get resolve() {
      return resolve;
    },
    get reject() {
      return reject;
    },
    get promise() {
      return promise;
    },
  };
}
