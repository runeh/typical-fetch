import { Readable } from 'stream';
import { URL, URLSearchParams } from 'url';
import {
  HeadersInit,
  BodyInit as OriginalBodyInit,
  RequestInit,
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
export type FetchCall<Ret, Arg, Err> = [Arg] extends [never]
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
  readonly parseJson?: (json: unknown, arg: any) => unknown;
  readonly parseResponse?: (res: Response, arg: any) => unknown;
  readonly parseText?: (body: string, arg: any) => unknown;
  readonly requestInit?: TypicalRequestInit;
}

export class TypicalWrappedError extends Error {
  name = 'TypicalWrappedError';
  constructor(
    public wrappedError: unknown,
    public response: Response | undefined,
    public bodyText: string | undefined,
    public request?: TypicalRequestInit,
  ) {
    super(wrappedError instanceof Error ? wrappedError.name : 'unknown');
  }
}

export class TypicalHttpError extends Error {
  name = 'TypicalHttpError';
  status: number;
  statusText: string;
  req?: TypicalRequestInit;
  res: Response;

  constructor(res: Response, req?: TypicalRequestInit) {
    super(`${res.status} ${res.statusText}`);
    this.status = res.status;
    this.statusText = res.statusText;
    this.res = res;
    this.req = req;
  }
}

export type TypicalRequestInit = Pick<RequestInit, 'redirect'>;

interface JsonObject {
  [member: string]: JsonValue;
}

type JsonArray = Array<JsonValue> | ReadonlyArray<JsonValue>;

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;

export type JsonRoot = JsonArray | JsonObject;
