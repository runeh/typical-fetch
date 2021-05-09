import { Readable } from 'stream';
import { URL, URLSearchParams } from 'url';
import {
  HeadersInit,
  BodyInit as OriginalBodyInit,
  Response,
} from 'node-fetch';

export type CallReturn<Ret, Err> =
  | { success: true; body: Ret; error: undefined }
  | { success: false; body: undefined; error: Err };

// The `[]` is due to this:
// https://github.com/microsoft/TypeScript/issues/23182#issuecomment-379091887

/**
 * The shape of the function returned by `.build()`. This conditional type
 * makes sure that the function takes no arguments if `Arg` is `never` or an
 * empty object, `Record<string, never>`.
 * Otherwise, the function takes Arg as a single argument
 */
export type BuiltCall<Ret, Arg, Err> = [Arg] extends [never]
  ? () => Promise<CallReturn<Ret, Err>>
  : Arg extends Record<string, never>
  ? () => Promise<CallReturn<Ret, Err>>
  : (args: Arg) => Promise<CallReturn<Ret, Err>>;

export type MergedArgs<OldArg, NewArg> = [OldArg] extends [never]
  ? Readonly<NewArg>
  : Readonly<OldArg & NewArg>;

export type BodyInit =
  | Exclude<OriginalBodyInit, ArrayBufferView | NodeJS.ReadableStream>
  | Readable;

export type HttpMethod = 'delete' | 'get' | 'head' | 'patch' | 'post' | 'put';

export type QueryParam = Record<string, string> | URLSearchParams;

export type BodyType = JsonRoot | BodyInit;

export interface CallRecord {
  readonly baseUrl?: URL;
  readonly errorMappers: ((error: any, arg: any) => unknown)[];
  readonly getBody?: (arg: any) => BodyType;
  readonly getHeaders: ((arg: any) => HeadersInit)[];
  readonly getPath?: (arg: any) => string;
  readonly getQuery: ((arg: any) => QueryParam)[];
  readonly mapError: ((arg: any) => unknown)[];
  readonly mappers: ((res: any, arg: any) => unknown)[];
  readonly method?: HttpMethod;
  readonly parseJson?: (arg: unknown) => unknown;
  readonly parseResponse?: (res: Response, arg: any) => unknown;
  readonly parseText?: (body: string, arg: unknown) => unknown;
}

export class TypicalWrappedError extends Error {
  name = 'TypicalWrappedError';
  constructor(public wrappedError: unknown) {
    super(wrappedError instanceof Error ? wrappedError.name : 'unknown');
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
