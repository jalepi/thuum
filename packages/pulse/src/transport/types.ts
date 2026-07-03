import type { StructLike, MaybePromise, EmptyResult } from "../base";
import type { StandardSchemaV1 } from "../standard-schema-v1";

export type TransportReceiveHandlers<T> = {
  ondata: (this: void, content: T) => MaybePromise<EmptyResult>;
  onerror?: (this: void, error: unknown) => MaybePromise<EmptyResult>;
};

type TransportConnection = { close(this: void): MaybePromise<void> };

export type TransportSendArgs<T extends StructLike = StructLike> = {
  [K in keyof T & string]: [topic: K, content: T[K]];
}[keyof T & string];

export type Transport<T extends StructLike = StructLike> = {
  send<K extends keyof T & string>(topic: K, content: T[K]): Promise<EmptyResult>;
  receive<K extends keyof T & string>(
    topic: K,
    handlers: TransportReceiveHandlers<T[K]>,
  ): MaybePromise<TransportConnection>;
};

export type SchemaLike<T extends StructLike = StructLike> = {
  [K in keyof T & string]: StandardSchemaV1<T[K]>;
};

export type InferStructLike<T extends SchemaLike> = {
  [K in keyof T]: StandardSchemaV1.InferInput<T[K]>;
};
