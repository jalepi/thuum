import { describe, it, expect, vi } from "bun:test";
import { probe } from "./probe";

describe("probe decorator tests", () => {
  const divideByZeroError = new Error("cannot divide by zero");
  function divide(a: number, b: number) {
    if (b === 0) {
      throw divideByZeroError;
    }
    return a / b;
  }

  it("should probe function arguments and success", () => {
    const spies = { args: vi.fn(), ret: vi.fn() };
    const decor = probe((...args) => {
      spies.args(args);
      return (result) => {
        spies.ret(result);
      };
    });

    const div = decor(divide);

    expect(div(4, 2)).toBe(2);
    expect(spies.args).toHaveBeenCalledWith([4, 2]);
    expect(spies.ret).toHaveBeenCalledWith({ value: 2 });
  });

  it("should probe function arguments and failure", () => {
    const spies = { args: vi.fn(), ret: vi.fn() };
    const decor = probe((...args) => {
      spies.args(args);
      return (result) => {
        spies.ret(result);
      };
    });

    const div = decor(divide);

    expect(() => div(4, 0)).toThrow(divideByZeroError);
    expect(spies.args).toHaveBeenCalledWith([4, 0]);
    expect(spies.ret).toHaveBeenCalledWith({ error: divideByZeroError });
  });

  it("should probe without return", () => {
    const spy = vi.fn();
    const decor = probe((...args) => {
      spy(args);
    });
    const div = decor(divide);

    expect(div(4, 2)).toBe(2);
    expect(spy).toHaveBeenCalledWith([4, 2]);
  });

  it("should probe typed", () => {
    interface A {
      foo: string;
    }
    interface B extends A {
      bar: string;
    }

    const spies = { args: vi.fn(), ret: vi.fn() };

    const decor = probe((a: A) => {
      spies.args(a);
      return (result) => {
        spies.ret(result);
      };
    });

    const fn1: (b: B) => B = (b: B) => b;

    const fn2: (b: B) => B = decor(fn1);

    const b = { foo: "foo1", bar: "bar1" };
    const res = fn2(b);
    expect(res).toBe(b);

    expect(spies.args).toHaveBeenCalledWith(b);
    expect(spies.ret).toHaveBeenCalledWith({ value: b });
  });

  it("should probe", () => {
    expect(() => {
      probe((...args) => {
        console.log("calling with", args);
        return (result) => {
          if ("error" in result) {
            console.log("throwing with", args, result.error);
            return;
          }
          console.log("returning with", args, result.value);
        };
      });
    }).not.toThrow();
  });

  const cases = [
    {
      performance: -1.0,
      minimum: 0.0,
      traces: [
        ["logger of rate entered", -1],
        ["logger of rate threw error", new Error("threshold of rate cannot be less than 0")],
      ],
    },
    {
      performance: 1.0,
      minimum: 0.0,
      traces: [
        ["logger of rate entered", 1],
        ["logger of rate returned value", "bad"],
      ],
    },
    {
      performance: 8.0,
      minimum: 0.0,
      traces: [
        ["logger of rate entered", 8],
        ["logger of rate returned value", "good"],
      ],
    },
  ];

  it.each(cases).only("should demo advanced scenarios", ({ performance, traces }) => {
    /*
    rate is a business function we would like to keep very lean.
    when exported and used, we would like to trace its usage.

    this example shows how to create a named probe (logger).
    it can be used by any other function as well.
    logger is a simple probe factory.
    it carries a method of string and traces function calls.

    */
    /**
     * Let's assume "rate" is a business function.
     * We would like to keep it very lean, only doing what is suppose to do.
     * @param performance
     * @returns business function
     */
    const rate = (performance: number): "good" | "bad" => {
      // if (performance < 0.0) {
      //   throw new Error(`perfomance cannot be negative`);
      // }
      return performance > 7.0 ? "good" : "bad";
    };

    const trace = vi.fn();

    /**
     * logger is a simple probe factory.
     * it carries method of string to the probe that traces function calls.
     * @param method
     * @returns decorator
     */
    const logger = (method: string) =>
      probe((...args: unknown[]) => {
        trace(`logger of ${method} entered`, ...args);
        return (result) => {
          if ("error" in result) {
            trace(`logger of ${method} threw error`, result.error);
          } else {
            trace(`logger of ${method} returned value`, result.value);
          }
        };
      });

    /**
     * threshold is a simple function guard.
     * it throws error when function receives less than minimum.
     * @param method
     * @param minimum
     * @returns decorator
     */
    const threshold = (method: string, minimum: number) =>
      probe((x: number) => {
        if (x < minimum) {
          throw new Error(`threshold of ${method} cannot be less than ${minimum.toFixed(0)}`);
        }
      });

    /**
     * a modified version of "rate" decorated by logger and threshold.
     * logger is outer, threshold is inner.
     * logger wraps threshold that wraps rate.
     * this way, logger will log when threshold throws.
     *
     * using piper would be easier to read.
     * @example
     * const { value: _rate } = pipe(rate)
     *   .pipe(threshold("rate", 0.0))
     *   .pipe(logger("rate"));
     */
    const _rate = logger("rate")(threshold("rate", 0.0)(rate));

    try {
      _rate(performance);
    } catch {
      //
    } finally {
      expect(traces).toStrictEqual(trace.mock.calls);
    }
  });
});
