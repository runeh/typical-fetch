import { URL } from 'url';
import fetch, { HeadersInit, Response } from 'node-fetch';
import { invariant } from 'ts-invariant';
import { applyErrorMappers, getFetchParams } from './common';
import {
  BodyType,
  CallRecord,
  CallReturn,
  FetchCall,
  HttpMethod,
  MergedArgs,
  QueryParam,
  TypicalHttpError,
  TypicalRequestInit,
  TypicalWrappedError,
} from './types';

export { unwrapError } from './common';

export { TypicalHttpError, TypicalWrappedError, CallReturn };

export class CallBuilder<
  Ret = void,
  Arg extends Record<string, any> = { baseUrl: string | URL },
  Err = TypicalWrappedError | TypicalHttpError,
> {
  private record: CallRecord;

  constructor(record?: CallRecord) {
    this.record = record ?? {
      errorMappers: [],
      getHeaders: [],
      getQuery: [],
      mappers: [],
      mapError: [],
    };
  }

  /**
   * Add a type for the argument required by the fetcher by passing it as a
   * generic, such as `builder.args<{name: string}>()`. Can be called multiple
   * times, the resulting type will be the intersecton of all the arguments.
   */
  args<T extends Record<string, unknown>>(): CallBuilder<
    Ret,
    MergedArgs<Arg, T>,
    Err
  > {
    return new CallBuilder(this.record);
  }

  /**
   * Set the HTTP method of the fetcher.
   */
  method(method: HttpMethod): CallBuilder<Ret, Arg, Err> {
    invariant(this.record.method == null, "Can't set method multiple times");
    return new CallBuilder({ ...this.record, method });
  }

  /**
   * Set the base URL for the fetcher. If this method is called, the `baseUrl`
   * argument is removed from the fetcher.
   */
  baseUrl(url: string | URL): CallBuilder<Ret, Omit<Arg, 'baseUrl'>, Err> {
    const baseUrl = new URL('', url);
    return new CallBuilder<Ret, Omit<Arg, 'baseUrl'>, Err>({
      ...this.record,
      baseUrl,
    });
  }

  /**
   * Options to this method is passed on to the underlying `fetch` call. Note,
   * only the `redirect` method is supported.
   */
  fetchOptions(opts: TypicalRequestInit): CallBuilder<Ret, Arg, Err> {
    return new CallBuilder({
      ...this.record,
      requestInit: { ...this.record.requestInit, ...opts },
    });
  }

  /**
   * Set the path the fetcher will send requests to. The path is joined with
   * the base URL.
   */
  path(path: string): CallBuilder<Ret, Arg, Err>;
  path(getPath: (args: Arg) => string): CallBuilder<Ret, Arg, Err>;
  path(
    pathOrFun: string | ((args: Arg) => string),
  ): CallBuilder<Ret, Arg, Err> {
    invariant(this.record.getPath == null, "Can't set path multiple times");
    const getPath =
      typeof pathOrFun === 'function' ? pathOrFun : () => pathOrFun;

    return new CallBuilder<Ret, Arg, Err>({ ...this.record, getPath });
  }

  /**
   * Add query arguments the fetcher will use when making HTTP requests. This
   * method can be called multiple times, to add more parameters.
   */
  query(params: QueryParam): CallBuilder<Ret, Arg, Err>;
  query(fun: (args: Arg) => QueryParam): CallBuilder<Ret, Arg, Err>;
  query(
    funOrQuery: QueryParam | ((args: Arg) => QueryParam),
  ): CallBuilder<Ret, Arg, Err> {
    const getQueryFun =
      typeof funOrQuery === 'function' ? funOrQuery : () => funOrQuery;

    return new CallBuilder<Ret, Arg, Err>({
      ...this.record,
      getQuery: [...this.record.getQuery, getQueryFun],
    });
  }

  /**
   * Add headers the fetcher will use when making HTTP requests. This
   * method can be called multiple times, to add more headers.
   */
  headers(headers: HeadersInit): CallBuilder<Ret, Arg, Err>;
  headers(fun: (args: Arg) => HeadersInit): CallBuilder<Ret, Arg, Err>;
  headers(
    funOrHeaders: HeadersInit | ((args: Arg) => HeadersInit),
  ): CallBuilder<Ret, Arg, Err> {
    const getHeadersFun =
      typeof funOrHeaders === 'function' ? funOrHeaders : () => funOrHeaders;

    return new CallBuilder<Ret, Arg, Err>({
      ...this.record,
      getHeaders: [...this.record.getHeaders, getHeadersFun],
    });
  }

  /**
   * Transform the returned data. This method can be called multiple times. Each
   * map function will receive the result of the previous mapper.
   */
  map<T>(mapper: (data: Ret, args: Arg) => T): CallBuilder<T, Arg, Err> {
    return new CallBuilder<T, Arg, Err>({
      ...this.record,
      mappers: [...this.record.mappers, mapper],
    });
  }

  /**
   * Transform errors raised when the fetcher is called. This method can be
   * called multiple times. Each map function will receive the result of the
   * previous mapper.
   */
  mapError<T>(
    mapper: (error: Err, args: Arg) => T | Promise<T>,
  ): CallBuilder<Ret, Arg, T> {
    return new CallBuilder<Ret, Arg, T>({
      ...this.record,
      errorMappers: [...this.record.errorMappers, mapper],
    });
  }

  /**
   * Add data the fetcher will send when making http requests.
   */
  body(data: BodyType): CallBuilder<Ret, Arg, Err>;
  body(fun: (args: Arg) => BodyType): CallBuilder<Ret, Arg, Err>;
  body(
    funOrData: ((args: Arg) => BodyType) | BodyType,
  ): CallBuilder<Ret, Arg, Err> {
    invariant(this.record.getBody == null, "Can't set body multiple times");
    const getBody =
      typeof funOrData === 'function' ? funOrData : () => funOrData;
    return new CallBuilder<Ret, Arg, Err>({ ...this.record, getBody });
  }

  /**
   * The passed in function will be called with the response data as JSON.
   */
  parseJson<T>(
    parser: (data: unknown, args: Arg) => T,
  ): CallBuilder<T, Arg, Err> {
    invariant(
      this.record.parseJson == null,
      'A json parser is already registered',
    );
    invariant(
      this.record.parseText == null,
      'A text parser is already registered',
    );
    invariant(
      this.record.parseResponse == null,
      'A response parser is already registered',
    );

    return new CallBuilder({ ...this.record, parseJson: parser });
  }

  /**
   * The passed in function will be called with the response data as text.
   */
  parseText<T>(
    parser: (data: string, args: Arg) => T,
  ): CallBuilder<T, Arg, Err> {
    invariant(
      this.record.parseJson == null,
      'A json parser is already registered',
    );
    invariant(
      this.record.parseText == null,
      'A text parser is already registered',
    );
    invariant(
      this.record.parseResponse == null,
      'A response parser is already registered',
    );

    return new CallBuilder({ ...this.record, parseText: parser });
  }

  /**
   * The passed in function will be called with the response object.
   */
  parseResponse<T>(
    parser: (res: Response, args: Arg) => Promise<T> | T,
  ): CallBuilder<T, Arg, Err> {
    invariant(
      this.record.parseJson == null,
      'A json parser is already registered',
    );
    invariant(
      this.record.parseText == null,
      'A text parser is already registered',
    );
    invariant(
      this.record.parseResponse == null,
      'A response parser is already registered',
    );

    return new CallBuilder<T, Arg, Err>({
      ...this.record,
      parseResponse: parser,
    });
  }

  /**
   * Create the fetcher function.
   */
  build(): FetchCall<Ret, Arg, Err> {
    const {
      getBody,
      getPath,
      mappers,
      method,
      errorMappers,
      parseJson,
      parseResponse,
      parseText,
      requestInit,
    } = this.record;

    invariant(getPath != null, 'No path set');
    invariant(method != null, 'No method set');
    if (getBody && ['head', 'get'].includes(method)) {
      throw new Error(`Can't include body in "${method}" request`);
    }

    const fun = async (args: Arg) => {
      let res: Response | undefined = undefined;
      let text: string | undefined = undefined;
      const baseUrl = this.record.baseUrl ?? args.baseUrl;
      try {
        const { body, headers, url } = getFetchParams(
          this.record,
          baseUrl,
          args,
        );

        res = await fetch(url, { ...requestInit, method, headers, body });
        if (!res.ok) {
          return {
            success: false,
            body: undefined,
            error: await applyErrorMappers(
              new TypicalHttpError(res),
              errorMappers,
              args,
            ),
          };
        }

        let data;

        if (parseResponse) {
          data = await parseResponse(res, args);
        } else if (parseText) {
          text = await res.text();
          const parsed = parseText(text, args);
          data = parsed;
        } else if (parseJson) {
          text = await res.text();
          const json = JSON.parse(text);
          const parsed = parseJson(json, args);
          data = parsed;
        } else {
          data = undefined;
        }

        for (const mapper of mappers) {
          data = mapper(data, args);
        }

        return { success: true, body: data, error: undefined };
      } catch (error: unknown) {
        return {
          success: false,
          body: undefined,
          error: await applyErrorMappers(
            new TypicalWrappedError(error, res, text),
            errorMappers,
            args,
          ),
        };
      }
    };

    return fun as any;
  }
}

export function buildCall(): CallBuilder {
  return new CallBuilder();
}
