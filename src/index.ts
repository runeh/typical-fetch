import { URL } from 'url';
import fetch, { HeadersInit } from 'node-fetch';
import { invariant } from 'ts-invariant';
import { applyErrorMappers, getFetchParams } from './common';
import {
  BodyType,
  BuiltCall,
  CallRecord,
  HttpMethod,
  MergedArgs,
  QueryParam,
  TypicalHttpError,
  TypicalWrappedError,
} from './types';

export { unwrapError } from './common';

class CallBuilder<
  Ret = void,
  Arg extends Record<string, unknown> & { baseUrl: string | URL } = Record<
    string,
    unknown
  > & { baseUrl: string | URL },
  Err = TypicalWrappedError | TypicalHttpError
> {
  record: CallRecord;

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
   * Add a type for the argument to the built call by passing it as a generic,
   * such as `builder.args<{name: string}>()`. Can be called multiple times,
   * the resulting type will be the intersecton of all the arguments.
   */
  args<T extends Record<string, unknown>>(): CallBuilder<
    Ret,
    MergedArgs<Arg, T>,
    Err
  > {
    return new CallBuilder(this.record);
  }

  /**
   * Set the HTTP method of the request being defined.
   */
  method(method: HttpMethod): CallBuilder<Ret, Arg, Err> {
    invariant(this.record.method == null, "Can't set method multiple times");
    return new CallBuilder({ ...this.record, method });
  }

  path(path: string): this;
  path(getPath: (args: Arg) => string): this;
  path(pathOrFun: string | ((args: Arg) => string)) {
    invariant(this.record.getPath == null, "Can't set path multiple times");
    const getPath =
      typeof pathOrFun === 'function' ? pathOrFun : () => pathOrFun;

    return new CallBuilder<Ret, Arg, Err>({ ...this.record, getPath });
  }

  query(headers: QueryParam): CallBuilder<Ret, Arg, Err>;
  query(fun: (args: Arg) => QueryParam): CallBuilder<Ret, Arg, Err>;
  query(funOrQuery: QueryParam | ((args: Arg) => QueryParam)) {
    const getQueryFun =
      typeof funOrQuery === 'function' ? funOrQuery : () => funOrQuery;

    return new CallBuilder<Ret, Arg, Err>({
      ...this.record,
      getQuery: [...this.record.getQuery, getQueryFun],
    });
  }

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

  map<T>(mapper: (data: Ret, args: Arg) => T): CallBuilder<T, Arg, Err> {
    return new CallBuilder<T, Arg, Err>({
      ...this.record,
      mappers: [...this.record.mappers, mapper],
    });
  }

  mapError<T>(mapper: (error: Err, args: Arg) => T): CallBuilder<Ret, Arg, T> {
    return new CallBuilder<Ret, Arg, T>({
      ...this.record,
      errorMappers: [...this.record.errorMappers, mapper],
    });
  }

  body(data: BodyType): this;
  body(fun: (args: Arg) => BodyType): this;
  body(funOrData: ((args: Arg) => BodyType) | BodyType) {
    invariant(this.record.getBody == null, "Can't set body multiple times");
    const getBody =
      typeof funOrData === 'function' ? funOrData : () => funOrData;
    return new CallBuilder<Ret, Arg, Err>({ ...this.record, getBody });
  }

  parseJson<T>(parser: (data: unknown) => T): CallBuilder<T, Arg, Err> {
    return new CallBuilder<T, Arg, Err>({ ...this.record, parseJson: parser });
  }

  build(): BuiltCall<Ret, Arg, Err> {
    const {
      getBody,
      getPath,
      mappers,
      method,
      errorMappers,
      parseJson,
    } = this.record;

    invariant(getPath != null, 'No path set');
    invariant(method != null, 'No method set');
    if (getBody && ['head', 'get', 'delete'].includes(method)) {
      throw new Error(`Can't include body in "${method}" request`);
    }

    const fun = async (args: Arg) => {
      try {
        const { body, headers, url } = getFetchParams(
          this.record,
          args.baseUrl as any, // fixme
          args,
        );

        const res = await fetch(url, { method, headers, body });
        if (!res.ok) {
          return {
            success: false,
            body: undefined,
            error: applyErrorMappers(
              new TypicalHttpError(res.status),
              errorMappers,
              args,
            ),
          };
        }

        let data;

        if (parseJson) {
          const text = await res.text();
          const json = JSON.parse(text);
          const parsed = parseJson(json);
          data = parsed;
        } else {
          // fixme: might be binary or text or whatevs
          // const text = await res.text();
          data = undefined;
        }

        for (const mapper of mappers) {
          data = mapper(data, args);
        }

        return { success: true, body: data, error: undefined };
      } catch (error: unknown) {
        // fixme: here goes error mappers stuff.
        return {
          success: false,
          body: undefined,
          error: applyErrorMappers(
            new TypicalWrappedError(error),
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

// type Lal<T> = T extends { baseUrl: string } & Record<string, any>
//   ? Omit<T, 'baseUrl'>
//   : T;

// type x = { name: string; foo: number, baseUrl: string };

// type Lol = Lal<x>;
