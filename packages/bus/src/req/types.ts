import type { StringDict } from "../types";

export type Discr<K extends string, V> = Record<K, V>;

export type ReqHandler<Map, K extends keyof Map> =
  Map extends ReqTyped<Map>
    ? (request: Map[K]["request"] & { type: K }) => Promise<Map[K]["response"] & { type: K }>
    : never;

export type ReqTyped<Map> = {
  [K in keyof Map]: { request: { type: K }; response: { type: K } };
};

export type ReqC<D extends string, Map> = {
  [K in keyof Map]: { request: Discr<D, K>; response: Discr<D, K> };
};

export type Req<D extends string, Map extends ReqC<D, Map>> = {
  handle<K extends keyof Map>(req: Map[K]["request"] & Discr<D, K>): Promise<Map[K]["response"] & Discr<D, K>>;
};

export type MakeReq<D extends string, Map extends StringDict<{ request: unknown; response: unknown }>> = {
  [K in keyof Map]: Map[K] & {
    request: Discr<D, K> & Map[K]["request"];
    response: Discr<D, K> & Map[K]["response"];
  };
};

export type RequestMessage<T> = { $$id: string; payload: T };
export type ResponseMessage<T> = { $$id: string; value: T } | { $$id: string; error: unknown };
