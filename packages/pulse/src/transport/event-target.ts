import type { EmptyResult, StructLike } from "../base";
import type { Transport } from "./types";

export const fromEventTarget = <T extends StructLike>(target: EventTarget): Transport<T> => {
  return {
    async send(topic, content) {
      const event = new CustomEvent(topic, { detail: content });
      return await new Promise<EmptyResult>((resolve) => {
        target.dispatchEvent(event);
        resolve({ success: true });
      });
    },
    receive(topic, { ondata }) {
      const listener = (event: Event) => {
        if (event.type !== topic) {
          return;
        }
        const { detail } = event as unknown as CustomEvent<T[typeof topic]>;
        void ondata(detail);
      };
      target.addEventListener(topic, listener);
      return {
        close() {
          target.removeEventListener(topic, listener);
        },
      };
    },
  };
};
