import type { EmptyResult, MaybePromise, StructLike } from "../base";
import type { Transport } from "./types";

type HookMap = {
  "before:send": { topic: string; content: unknown };
  "after:send": { topic: string; content: unknown; result: EmptyResult };
  "before:receive:data": { topic: string; content: unknown };
  "before:receive:error": { topic: string; error: unknown };
  "after:receive:data": { topic: string; content: unknown; result: EmptyResult };
  "after:receive:error": { topic: string; error: unknown; result: EmptyResult };
  "before:connect": { topic: string };
  "after:connect": { topic: string };
  "before:disconnect": { topic: string };
  "after:disconnect": { topic: string };
};

export type TransportHook = <K extends keyof HookMap>(hook: K, payload: HookMap[K]) => MaybePromise<void>;

export const withHooks =
  (hook: TransportHook) =>
  <T extends StructLike>(transport: Transport<T>): Transport<T> => {
    return {
      async send(topic, content) {
        await hook("before:send", { topic, content });
        const result = await transport.send(topic, content);
        await hook("after:send", { topic, content, result });
        return result;
      },
      async receive(topic, { ondata, onerror }) {
        await hook("before:connect", { topic });
        const { close } = await transport.receive(topic, {
          async ondata(content) {
            await hook("before:receive:data", { topic, content });
            const result = await ondata(content);
            await hook("after:receive:data", { topic, content, result });
            return result;
          },
          onerror: onerror
            ? async (error) => {
                await hook("before:receive:error", { topic, error });
                const result = await onerror(error);
                await hook("after:receive:error", { topic, error, result });
                return result;
              }
            : undefined,
        });
        await hook("after:connect", { topic });

        return {
          async close() {
            await hook("before:disconnect", { topic });
            await close();
            await hook("before:disconnect", { topic });
          },
        };
      },
    };
  };
