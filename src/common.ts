import { Readable } from 'stream';
import { URL, URLSearchParams } from 'url';
import invariant from 'ts-invariant';
import { BodyInit, FormData, Headers, HeadersInit } from 'undici';
import { BodyType, CallRecord, QueryParam, TypicalWrappedError } from './types';

/**
 * Tries to detect if something is a FormData object. Since the consuming code
 * may be using a different version of form-data than this lib, we can't trust
 * the instanceof check to always work. The `form-data` package explicitly sets
 * the return value of `someFormData.toString()` to `[object FormData]`, so we
 * use that for the extra check.
 * @param thing
 * @returns
 */
export function isFormData(thing: BodyType | undefined): thing is FormData {
  return thing == null
    ? false
    : thing instanceof FormData || thing.toString() === '[object FormData]';
}

export function getBodyInfo(data: BodyType | undefined): {
  body?: BodyInit;
  contentType?: string;
} {
  if (data === undefined) {
    return {};
  } else if (typeof data === 'string') {
    return { body: data, contentType: 'text/plain' };
  } else if (
    Buffer.isBuffer(data) ||
    data instanceof Readable ||
    data instanceof URLSearchParams ||
    isFormData(data)
  ) {
    return { body: data };
  } else {
    // must be json at this point
    // fixme: what about things that throw here? Can that happen?
    return { body: JSON.stringify(data), contentType: 'application/json' };
  }
}

export function mergeQueryParams(defs: QueryParam[]): URLSearchParams {
  const pairs = defs
    .map((e) => new URLSearchParams(e))
    .flatMap<[string, string]>((e) => Array.from(e.entries()));
  return new URLSearchParams(pairs);
}

export function mergeHeaders(defs: HeadersInit[]): Headers {
  const headersList = defs.flatMap((e) => {
    if (Array.isArray(e)) {
      return e;
    } else if (e instanceof Headers) {
      return Array.from(e.entries());
    } else {
      return Object.entries(e).reduce<string[][]>((c, [key, val]) => {
        if (Array.isArray(val)) {
          val.forEach((v) => {
            c.push([key, v]);
          });
        } else {
          c.push([key, val as string]);
        }
        return c;
      }, []);
    }
  });

  return new Headers(headersList);
}

export function buildUrl(baseUrl: string | URL, path: string): URL {
  const base = new URL('', baseUrl);
  const fullPath = [base.pathname, path]
    .flatMap((e) => e.split('/'))
    .filter((e) => e !== '')
    .join('/');

  return new URL(fullPath, base.origin);
}

export function getFetchParams(
  record: CallRecord,
  baseUrl: string | URL,
  args: any,
): { url: URL; headers: Headers; body: BodyInit | undefined } {
  const { getHeaders, getBody, getPath, getQuery } = record;
  invariant(getPath != null, 'No path set');

  const path = getPath(args);

  const url = buildUrl(baseUrl, path);

  mergeQueryParams(getQuery.map((e) => e(args))).forEach((val, key) => {
    return url.searchParams.append(key, val);
  });

  const headers = mergeHeaders(getHeaders.map((e) => e(args)));
  const rawBody = getBody ? getBody(args) : undefined;
  const { body, contentType } = getBodyInfo(rawBody);

  if (contentType) {
    headers.set('content-type', contentType);
  }

  return { url, headers, body };
}

export async function applyErrorMappers(
  error: any,
  mappers: CallRecord['errorMappers'],
  args: any,
) {
  let newError = error;
  for (const mapper of mappers) {
    newError = await mapper(newError, args);
  }
  return newError;
}

export function unwrapError(err: unknown): unknown {
  return err instanceof TypicalWrappedError ? err.wrappedError : undefined;
}
