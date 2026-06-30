export type StructLike = {
  [prop: string]: unknown;
  [prop: number]: never;
  [prop: symbol]: never;
};

export type MaybePromise<T> = T | Promise<T>;
export type Message<Topic extends string = string, Content = unknown> = {
  readonly topic: Topic;
  readonly content: Content;
};

export type EmptyResult<Error = unknown> =
  | {
      success: true;
      error?: never;
    }
  | {
      success: false;
      error: Error;
      trace?: Error[];
    };

export type Result<Data = unknown, Error = unknown> =
  | {
      success: true;
      data: Data;
      error?: never;
    }
  | {
      success: false;
      data?: never;
      error: Error;
      trace: Error[];
    };
