import type { EmptyResult, StructLike } from "../base";
import type { Transport, TransportReceiveHandlers } from "./types";

export const inMemoryTransport = <T extends StructLike>(): Transport<T> => {
  const map: { [K in keyof T & string]?: Set<TransportReceiveHandlers<T[K]>> } = {};

  return {
    send(topic, content) {
      return new Promise<EmptyResult>((resolve, reject) => {
        if (!map[topic]) {
          resolve({ success: true });
          return;
        }
        const promises = [...map[topic].values()].map(async ({ ondata }) => await ondata(content));
        Promise.allSettled(promises)
          .then((settled) => {
            const issues: unknown[] = [];
            for (const s of settled) if (s.status === "rejected") issues.push(s.reason);
            resolve(issues.length > 0 ? { success: false, error: { issues } } : { success: true });
          })
          .catch(reject);
      });
    },

    receive(topic, handlers) {
      if (!map[topic]) {
        map[topic] = new Set();
      }
      map[topic].add(handlers);
      return {
        close() {
          if (!map[topic]) {
            return;
          }
          map[topic].delete(handlers);
          if (map[topic].size === 0) {
            map[topic] = undefined;
          }
        },
      };
    },
  };
};
