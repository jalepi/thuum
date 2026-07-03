import { describe, it, expect, vi } from "bun:test";
import { createChannel, createMultiChannel } from "./async-channel";

describe("async-channel tests", () => {
  it("should resolve values from the channel", async () => {
    const spy = vi.fn();
    const { producer, consumer } = createChannel<string>();
    const iterable = consumer.enumerate();
    producer.next("hello");
    producer.next("world");
    producer.next(":)");
    producer.return();

    for await (const value of iterable) {
      spy(value);
    }

    expect(spy).toHaveBeenCalledTimes(3);
    expect(spy).toHaveBeenCalledWith("hello");
    expect(spy).toHaveBeenCalledWith("world");
    expect(spy).toHaveBeenCalledWith(":)");
  });
});

describe("async-multi-channel tests", () => {
  it("should resolve values from multi-channel", async () => {
    const spy1 = vi.fn();
    const spy2 = vi.fn();
    const spy3 = vi.fn();
    const { producer, consumer } = createMultiChannel<string>();
    const iter1 = consumer.enumerate();
    const iter2 = consumer.enumerate();
    const iter3 = consumer.enumerate();
    producer.next("hello");
    producer.next("world");
    producer.next(":)");
    producer.return();

    for await (const value of iter1) {
      spy1(value);
    }

    for await (const value of iter2) {
      spy2(value);
    }

    for await (const value of iter3) {
      spy3(value);
    }

    expect(spy1).toHaveBeenCalledTimes(3);
    expect(spy2).toHaveBeenCalledTimes(3);
    expect(spy3).toHaveBeenCalledTimes(3);
    expect(spy1).toHaveBeenCalledWith("hello");
    expect(spy2).toHaveBeenCalledWith("hello");
    expect(spy3).toHaveBeenCalledWith("hello");
    expect(spy1).toHaveBeenCalledWith("world");
    expect(spy2).toHaveBeenCalledWith("world");
    expect(spy3).toHaveBeenCalledWith("world");
    expect(spy1).toHaveBeenCalledWith(":)");
    expect(spy2).toHaveBeenCalledWith(":)");
    expect(spy3).toHaveBeenCalledWith(":)");
  });
});
