import { Readable } from 'stream';
import { URLSearchParams } from 'url';
import { HeadersInit, BodyInit as OriginalBodyInit } from 'node-fetch';

export type CallReturn<Ret, Err> =
  | { success: true; body: Ret; error: undefined }
  | { success: false; body: undefined; error: Err };

// The `[]` is due to this:
// https://github.com/microsoft/TypeScript/issues/23182#issuecomment-379091887

export type BuiltCall<Ret, Arg, Err> = [Arg] extends [never]
  ? (baseUrl: string) => Promise<CallReturn<Ret, Err>>
  : (baseUrl: string, args: Arg) => Promise<CallReturn<Ret, Err>>;

export type MergedArgs<OldArg, NewArg> = [OldArg] extends [never]
  ? NewArg
  : OldArg & NewArg;

export type BodyInit =
  | Exclude<OriginalBodyInit, ArrayBufferView | NodeJS.ReadableStream>
  | Readable;

export type HttpMethod = 'delete' | 'get' | 'head' | 'patch' | 'post' | 'put';

export type QueryParam = Record<string, string> | URLSearchParams;

export type BodyType = JsonRoot | BodyInit;

export interface CallRecord {
  getBody?: (arg: any) => BodyType;
  getHeaders: ((arg: any) => HeadersInit)[];
  getPath?: (arg: any) => string;
  getQuery: ((arg: any) => QueryParam)[];
  mapError: ((arg: any) => unknown)[];
  mappers: ((res: any, arg: any) => unknown)[];
  errorMappers: ((error: any, arg: any) => unknown)[];
  method?: HttpMethod;
  parseJson?: (arg: unknown) => unknown;
}

export class TypicalError extends Error {
  name = 'TypicalError';
  constructor(public wrappedError: unknown, message?: string) {
    super(`WrappedError: ${message ?? 'unknown'}`);
  }
}

export class TypicalHttpError extends Error {
  name = 'TypicalHttpError';
  constructor(public status: number, message?: string) {
    super(message ?? `Status: ${status}`);
  }
}

interface JsonObject {
  [member: string]: JsonValue;
}

type JsonArray = Array<JsonValue>;

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;

export type JsonRoot = JsonArray | JsonObject;
