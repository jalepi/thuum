import type { Any } from "./types";

type Decorator<F extends (...args: Any[]) => unknown> = <F2 extends F>(
  fn: F2,
) => (this: ThisParameterType<F2>, ...args: Parameters<F2>) => ReturnType<F2>;

export const decorate =
  <const Func extends (this: unknown, ...args: Any[]) => unknown>(
    decorator: (fn: Func, ...args: Parameters<Func>) => ReturnType<Func>,
  ): Decorator<Func> =>
  (fn) => {
    return function (this, ...args) {
      return decorator(fn.bind(this) as Func, ...args);
    };
  };
