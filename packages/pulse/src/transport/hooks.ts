import type { EmptyResult, MaybePromise, StructLike } from "../base";
import type { Transport } from "./types";

type HookMap = {
  "before:send": [topic: string, content: unknown];
  "after:send": [topic: string, content: unknown, result: EmptyResult];
  "before:ondata": [topic: string, content: unknown];
  "after:ondata": [topic: string, content: unknown, result: EmptyResult];
  "before:onerror": [topic: string, error: unknown];
  "after:onerror": [topic: string, error: unknown, result: EmptyResult];
};

type Hook = <H extends keyof HookMap>(hook: H, ...args: HookMap[H]) => MaybePromise<void>;

export const withHook =
  (hook: Hook) =>
  <T extends StructLike>(transport: Transport<T>): Transport<T> => {
    return {
      async send(topic, content) {
        await hook("before:send", topic, content);
        const result = await transport.send(topic, content);
        await hook("after:send", topic, content, result);
        return result;
      },
      receive(topic, { ondata, onerror }) {
        return transport.receive(topic, {
          async ondata(content) {
            await hook("before:ondata", topic, content);
            const result = await ondata(content);
            await hook("after:ondata", topic, content, result);
            return result;
          },
          onerror: onerror
            ? async (error) => {
                await hook("before:onerror", topic, error);
                const result = await onerror(error);
                await hook("after:onerror", topic, error, result);
                return result;
              }
            : undefined,
        });
      },
    };
  };
