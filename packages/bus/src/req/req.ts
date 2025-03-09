import { PromiseNext } from "../next";
import type { ReqHandler, ReqTyped, RequestMessage, ResponseMessage } from "./types";

export const req = <Map extends ReqTyped<Map>>() => {
  return {
    send: async <K extends keyof Map & string>(
      request: Map[K]["request"] & { type: K },
    ): Promise<Map[K]["response"] & { type: K }> => {
      const channels = {
        request: new BroadcastChannel(`request:${request.type}`),
        response: new BroadcastChannel(`response:${request.type}`),
      };
      let seed = 0;
      const { promise, resolve, reject } = PromiseNext.withResolvers<Map[K]["response"] & { type: K }>();
      const handleResponse = (ev: MessageEvent) => {
        const response = ev.data as ResponseMessage<Map[K]["response"] & { type: K }>;
        if ("error" in response) {
          reject(response.error);
          return;
        }
        resolve(response.value);
      };
      channels.response.addEventListener("message", handleResponse);
      try {
        const id = seed++;
        channels.request.postMessage({ $$id: id.toFixed(0), payload: request } satisfies RequestMessage<
          Map[K]["request"] & { type: K }
        >);
        return await promise;
      } finally {
        channels.response.removeEventListener("message", handleResponse);
      }
    },
    of: <K extends keyof Map & string>(type: K) => {
      const channels = {
        request: new BroadcastChannel(`request:${type}`),
        response: new BroadcastChannel(`response:${type}`),
      };
      let seed = 0;
      return {
        handle: async (request: Map[K]["request"] & { type: K }): Promise<Map[K]["response"] & { type: K }> => {
          const { promise, resolve, reject } = PromiseNext.withResolvers<Map[K]["response"] & { type: K }>();
          const handleResponse = (ev: MessageEvent) => {
            const response = ev.data as ResponseMessage<Map[K]["response"] & { type: K }>;
            if ("error" in response) {
              reject(response.error);
              return;
            }
            resolve(response.value);
          };
          channels.response.addEventListener("message", handleResponse);
          try {
            const id = seed++;
            channels.request.postMessage({ $$id: id.toFixed(0), payload: request } satisfies RequestMessage<
              Map[K]["request"] & { type: K }
            >);
            return await promise;
          } finally {
            channels.response.removeEventListener("message", handleResponse);
          }
        },
      };
    },
  };
};

export const rep = <Map extends ReqTyped<Map>>() => {
  const disposables: { dispose: () => void }[] = [];
  return {
    disconnect(): void {
      for (const disposable of disposables) {
        disposable.dispose();
      }
      disposables.length = 0;
    },
    listen<K extends keyof Map & string>(type: K, handler: ReqHandler<Map, K>): void {
      const channels = {
        request: new BroadcastChannel(`request:${type}`),
        response: new BroadcastChannel(`response:${type}`),
      };

      const messageHandler = (ev: MessageEvent) => {
        const { $$id, payload: request } = ev.data as RequestMessage<Parameters<typeof handler>[0]>;
        handler(request)
          .then((response) => {
            const responseMessage: ResponseMessage<typeof response> = { $$id, value: response };
            channels.response.postMessage(responseMessage);
          })
          .catch((error: unknown) => {
            const responseMessage: ResponseMessage<unknown> = { $$id, error };
            channels.response.postMessage(responseMessage);
          });
      };
      channels.request.addEventListener("message", messageHandler);
      disposables.push({
        dispose() {
          channels.request.removeEventListener("message", messageHandler);
        },
      });
    },
  };
};
