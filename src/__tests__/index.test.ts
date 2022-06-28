import { URL, URLSearchParams } from 'url';
import { resolve } from 'path';
import { FormData, Headers } from 'undici';
import nock from 'nock';
import { buildCall } from '../index';
import { buildUrl, isFormData, unwrapError } from '../common';
import invariant from 'ts-invariant';
import { createReadStream } from 'fs';
import { TypicalHttpError } from '../types';

const baseUrl = 'http://www.example.org';

describe('call builder', () => {
  describe('method', () => {
    it('get', async () => {
      const scope = nock(baseUrl) //
        .get('/boop')
        .reply(200, 'OK');

      const fetcher = buildCall() //
        .path('/boop')
        .method('get')
        .build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });

    it('post', async () => {
      const scope = nock(baseUrl) //
        .post('/boop')
        .reply(200, 'OK');

      const fetcher = buildCall() //
        .path('/boop')
        .method('post')
        .build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });

    it('head', async () => {
      const scope = nock(baseUrl) //
        .head('/boop')
        .reply(200, 'OK');

      const fetcher = buildCall() //
        .path('/boop')
        .method('head')
        .build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });

    it('put', async () => {
      const scope = nock(baseUrl) //
        .put('/boop')
        .reply(200, 'OK');

      const fetcher = buildCall() //
        .path('/boop')
        .method('put')
        .build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });

    it('delete', async () => {
      const scope = nock(baseUrl) //
        .delete('/boop')
        .reply(200, 'OK');

      const fetcher = buildCall() //
        .path('/boop')
        .method('delete')
        .build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });

    it('patch', async () => {
      const scope = nock(baseUrl) //
        .patch('/boop')
        .reply(200, 'OK');

      const fetcher = buildCall() //
        .path('/boop')
        .method('patch')
        .build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });
  });

  describe('path', () => {
    it('string path', async () => {
      const scope = nock(baseUrl) //
        .get('/boop')
        .reply(200, 'OK');

      const fetcher = buildCall() //
        .path('/boop')
        .method('get')
        .build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });

    it('callback path no args', async () => {
      const scope = nock(baseUrl) //
        .get('/boop')
        .reply(200, 'OK');

      const fetcher = buildCall()
        .method('get')
        .path(() => '/boop')
        .build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });

    it('callback path with args', async () => {
      const scope = nock(baseUrl) //
        .get('/name/rune')
        .reply(200, 'OK');

      const fetcher = buildCall()
        .method('get')
        .args<{ name: string }>()
        .path((e) => `/name/${e.name}`)
        .build();

      await fetcher({ baseUrl, name: 'rune' });

      expect(scope.isDone()).toEqual(true);
    });

    it('merges with path from baseUrl when no leading slash', async () => {
      const scope = nock(baseUrl) //
        .get('/superpath/subpath')
        .reply(200, 'OK');

      const fetcher = buildCall() //
        .method('get')
        .path('subpath')
        .build();

      await fetcher({ baseUrl: 'http://www.example.org/superpath' });
      expect(scope.isDone()).toEqual(true);
    });

    it('merges with path from baseUrl when no leading slash and baseUrl is URL', async () => {
      const scope = nock(baseUrl) //
        .get('/superpath/subpath')
        .reply(200, 'OK');

      const fetcher = buildCall() //
        .method('get')
        .path('subpath')
        .build();

      await fetcher({ baseUrl: new URL('http://www.example.org/superpath') });
      expect(scope.isDone()).toEqual(true);
    });
  });

  describe('redirects', () => {
    it('redirects by default', async () => {
      const scope = nock(baseUrl)
        .get('/boop')
        .reply(302, undefined, {
          Location: 'http://www.example.org/redirected',
        })
        .get('/redirected')
        .reply(204, 'OK');

      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .parseResponse((e) => e.status)
        .build();

      const res = await fetcher({ baseUrl });
      expect(res.success);
      expect(res.body).toEqual(204);
      expect(scope.isDone()).toEqual(true);
    });

    /**
     * Todo:
     * This now throws because we check for `.ok`, which is only true for
     * status codes between 200-299.
     *
     * What do we want to do? Check the fetchoptions thing before raising an
     * error?
     */
    it.skip('can disable redirects', async () => {
      const scope = nock(baseUrl) //
        .get('/boop')
        .reply(302, undefined, {
          Location: 'http://www.example.org/redirected',
        });

      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .fetchOptions({ redirect: 'manual' })
        .parseResponse((e) => e.status)
        .build();

      const res = await fetcher({ baseUrl });
      expect(res.success);
      expect(res.body).toEqual(204);
      expect(scope.isDone()).toEqual(true);
    });
  });

  describe('query parameters', () => {
    it('object', async () => {
      const scope = nock(baseUrl) //
        .get('/boop?foo=bar')
        .reply(200, 'OK');

      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .query({ foo: 'bar' })
        .build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });

    it('multiple objects', async () => {
      const scope = nock(baseUrl)
        .get('/boop?foo=bar&baz=phlebotinum')
        .reply(200, 'OK');

      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .query({ foo: 'bar' })
        .query({ baz: 'phlebotinum' })
        .build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });

    // fixme: is this what we want?
    it('multiple objects, uses both', async () => {
      const scope = nock(baseUrl)
        .get('/boop?foo=first&foo=second')
        .reply(200, 'OK');

      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .query({ foo: 'first' })
        .query({ foo: 'second' })
        .build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });

    it('callback returning object', async () => {
      const scope = nock(baseUrl) //
        .get('/boop?foo=first')
        .reply(200, 'OK');

      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .query(() => ({ foo: 'first' }))
        .build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });

    it('urlsearchparams as value', async () => {
      const scope = nock(baseUrl) //
        .get('/boop?foo=first')
        .reply(200, 'OK');

      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .query(new URLSearchParams({ foo: 'first' }))
        .build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });

    it('urlsearchparams as callback', async () => {
      const scope = nock(baseUrl) //
        .get('/boop?foo=first')
        .reply(200, 'OK');

      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .args<{ value: string }>()
        .query((e) => new URLSearchParams({ foo: e.value }))
        .build();

      await fetcher({ baseUrl, value: 'first' });

      expect(scope.isDone()).toEqual(true);
    });

    it('mixed object and params', async () => {
      const scope = nock(baseUrl)
        .get('/boop?foo=first&name=rune')
        .reply(200, 'OK');

      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .args<{ value: string }>()
        .query((e) => new URLSearchParams({ foo: e.value }))
        .query({ name: 'rune' })
        .build();

      await fetcher({ baseUrl, value: 'first' });

      expect(scope.isDone()).toEqual(true);
    });
  });

  describe('header parameters', () => {
    it('object', async () => {
      const scope = nock(baseUrl)
        .get('/boop')
        .reply(200, 'OK')
        .matchHeader('User-Agent', 'typical-fetch');

      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .headers({ 'User-Agent': 'typical-fetch' })
        .build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });

    it('array', async () => {
      const scope = nock(baseUrl)
        .get('/boop')
        .reply(200, 'OK')
        .matchHeader('User-Agent', 'typical-fetch');

      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .headers([['User-Agent', 'typical-fetch']])
        .build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });

    it('Header', async () => {
      const scope = nock(baseUrl)
        .get('/boop')
        .reply(200, 'OK')
        .matchHeader('User-Agent', 'typical-fetch');

      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .headers(new Headers({ 'User-Agent': 'typical-fetch' }))
        .build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });

    it('callback', async () => {
      const scope = nock(baseUrl)
        .get('/boop')
        .reply(200, 'OK')
        .matchHeader('User-Agent', 'typical-fetch');

      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .args<{ ua: string }>()
        .headers(({ ua }) => ({ 'User-Agent': ua }))
        .build();

      await fetcher({ baseUrl, ua: 'typical-fetch' });

      expect(scope.isDone()).toEqual(true);
    });

    it('multiple objects', async () => {
      const scope = nock(baseUrl)
        .get('/boop')
        .reply(200, 'OK')
        .matchHeader('User-Agent', 'typical-fetch')
        .matchHeader('token', 'abcd');

      const fetcher = buildCall()
        .headers({ token: 'abcd' })
        .path('/boop')
        .method('get')
        .headers({ 'User-Agent': 'typical-fetch' })
        .build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });
  });

  describe('response parsing', () => {
    it('synchronous parser', async () => {
      const scope = nock(baseUrl) //
        .get('/boop')
        .reply(204, 'OK');

      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .parseResponse((res) => res.status)
        .build();

      const res = await fetcher({ baseUrl });

      expect(res.body).toEqual(204);
      expect(scope.isDone()).toEqual(true);
    });

    it('synchronous parser gets args', async () => {
      const scope = nock(baseUrl) //
        .get('/boop')
        .reply(200, 'OK');

      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .args<{ addition: number }>()
        .parseResponse((res, args) => res.status + args.addition)
        .build();

      const res = await fetcher({ baseUrl, addition: 42 });

      expect(res.body).toEqual(242);
      expect(scope.isDone()).toEqual(true);
    });

    it('asynchronous parser', async () => {
      const scope = nock(baseUrl) //
        .get('/boop')
        .reply(204, 'OK');

      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .parseResponse(async (res) => res.status)
        .build();

      const res = await fetcher({ baseUrl });

      expect(res.body).toEqual(204);
      expect(scope.isDone()).toEqual(true);
    });
  });

  describe('text parsing', () => {
    it('basic', async () => {
      const scope = nock(baseUrl) //
        .get('/boop')
        .reply(200, 'foo;bar;baz');

      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .parseText((raw) => raw.split(';'))
        .build();

      const res = await fetcher({ baseUrl });

      expect(res.body).toEqual(['foo', 'bar', 'baz']);
      expect(scope.isDone()).toEqual(true);
    });

    it('basic with args', async () => {
      const scope = nock(baseUrl) //
        .get('/boop')
        .reply(200, 'foo;bar;baz');

      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .args<{ separator: string }>()
        .parseText((raw, args) => raw.split(args.separator))
        .build();

      const res = await fetcher({ baseUrl, separator: ';' });

      expect(res.body).toEqual(['foo', 'bar', 'baz']);
      expect(scope.isDone()).toEqual(true);
    });
  });

  describe('json parsing', () => {
    it('basic', async () => {
      const scope = nock(baseUrl)
        .get('/boop')
        .reply(200, { user: { name: 'Rune' } });

      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .parseJson((raw) => raw as { user: { name: string } })
        .build();

      const res = await fetcher({ baseUrl });

      expect(res.body?.user.name).toEqual('Rune');
      expect(scope.isDone()).toEqual(true);
    });

    it('basic with args', async () => {
      const scope = nock(baseUrl)
        .get('/boop')
        .reply(200, { user: { name: 'Rune' } });

      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .args<{ redact: boolean }>()
        .parseJson((raw, args) => {
          const data = raw as { user: { name: string } };
          if (args.redact) {
            data.user.name = 'redacted';
          }
          return data;
        })
        .build();

      const res = await fetcher({ baseUrl, redact: true });

      expect(res.body?.user.name).toEqual('redacted');
      expect(scope.isDone()).toEqual(true);
    });

    it('expected error if parser throws', async () => {
      const scope = nock(baseUrl)
        .get('/boop')
        .reply(200, { user: { name: 'Rune' } });

      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .parseJson(() => {
          throw new Error('whoops');
          return 'asdf';
        })
        .build();

      const res = await fetcher({ baseUrl });

      expect(res.success).toEqual(false);
      expect(res.error).toMatchInlineSnapshot(`[TypicalWrappedError: Error]`);
      expect(scope.isDone()).toEqual(true);
    });

    it('expected error if malformed response', async () => {
      const scope = nock(baseUrl)
        .get('/boop')
        .reply(200, '{ malformed: "missing close brace ->" ');

      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .parseJson((e) => e as { malformed: string })
        .build();

      const res = await fetcher({ baseUrl });

      expect(res.success).toEqual(false);
      invariant(res.success === false);
      const err = unwrapError(res.error);
      expect(err).toMatchInlineSnapshot(
        `[SyntaxError: Unexpected token m in JSON at position 2]`,
      );
      expect(scope.isDone()).toEqual(true);
    });
  });

  describe('mappers', () => {
    it('no body', async () => {
      const scope = nock(baseUrl)
        .get('/boop')
        .reply(200, { user: { name: 'Rune' } });

      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .map((e) => ({ name: 'Rune' }))
        .build();

      const res = await fetcher({ baseUrl });

      expect(res.success).toEqual(true);
      expect(res.body?.name).toEqual('Rune');
      expect(scope.isDone()).toEqual(true);
    });

    it('single mapper', async () => {
      const scope = nock(baseUrl)
        .get('/boop')
        .reply(200, { user: { name: 'Rune' } });

      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .parseJson((raw) => raw as { user: { name: string } })
        .map((e) => e.user.name.toUpperCase())
        .build();

      const res = await fetcher({ baseUrl });
      expect(res.body).toEqual('RUNE');
      expect(scope.isDone()).toEqual(true);
    });

    it('gets args', async () => {
      const scope = nock(baseUrl)
        .get('/boop')
        .reply(200, { user: { name: 'Rune' } });

      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .args<{ name: string }>()
        .parseJson((raw) => raw as { user: { name: string } })
        .map((data, args) => data.user.name.toUpperCase() + args.name)
        .build();

      const res = await fetcher({ baseUrl, name: 'foo' });

      expect(res.body).toEqual('RUNEfoo');
      expect(scope.isDone()).toEqual(true);
    });

    it('multiple mappers', async () => {
      const scope = nock(baseUrl)
        .get('/boop')
        .reply(200, { user: { name: 'Rune' } });

      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .parseJson((raw) => raw as { user: { name: string } })
        .map((e) => e.user.name)
        .map((e) => e.toUpperCase())
        .build();

      const res = await fetcher({ baseUrl });

      expect(res.body).toEqual('RUNE');
      expect(scope.isDone()).toEqual(true);
    });
  });

  describe('request bodies', () => {
    it('text literal', async () => {
      const scope = nock(baseUrl)
        .post('/boop', 'heloes!')
        .matchHeader('content-type', 'text/plain')
        .reply(200);

      const fetcher = buildCall()
        .path('/boop')
        .method('post')
        .body('heloes!')
        .build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });

    it('text literal callback', async () => {
      const scope = nock(baseUrl)
        .post('/boop', 'heloes!')
        .matchHeader('content-type', 'text/plain')
        .reply(200);

      const fetcher = buildCall()
        .path('/boop')
        .method('post')
        .body(() => 'heloes!')
        .build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });

    it('json', async () => {
      const scope = nock(baseUrl)
        .post('/boop', { name: 'Rune' })
        .matchHeader('content-type', 'application/json')
        .reply(200);

      const fetcher = buildCall()
        .path('/boop')
        .method('post')
        .body({ name: 'Rune' })
        .build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });

    it('json from callback', async () => {
      const scope = nock(baseUrl)
        .post('/boop', { name: 'Rune' })
        .matchHeader('content-type', 'application/json')
        .reply(200);

      const fetcher = buildCall()
        .args<{ name: string }>()
        .path('/boop')
        .method('post')
        .body((args) => ({ name: args.name }))
        .build();

      await fetcher({ baseUrl, name: 'Rune' });

      expect(scope.isDone()).toEqual(true);
    });

    it('URLSearchParams', async () => {
      const scope = nock(baseUrl)
        .post('/boop', 'name=Rune')
        .matchHeader(
          'content-type',
          'application/x-www-form-urlencoded;charset=UTF-8',
        )
        .reply(200);

      const fetcher = buildCall()
        .path('/boop')
        .method('post')
        .body(new URLSearchParams({ name: 'Rune' }))
        .build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });

    it('FormData', async () => {
      const scope = nock(baseUrl)
        .post('/boop', /.*form-data.*/) // fixme: too naive
        .matchHeader('content-type', /multipart\/form-data;.*/)
        .reply(200);

      const formData = new FormData();
      formData.append('boop', 'snoot');

      const fetcher = buildCall()
        .path('/boop')
        .method('post')
        .body(formData)
        .build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });

    it('FormData file', async () => {
      const scope = nock(baseUrl)
        .post('/boop', /.*form-data.*/) // fixme: too naive
        .matchHeader('content-type', /multipart\/form-data;.*/)
        .reply(200);

      const pth = resolve(__dirname, '../../README.md');

      const formData = new FormData();
      formData.append('my_file', createReadStream(pth));

      const fetcher = buildCall()
        .path('/boop')
        .method('post')
        .body(formData)
        .build();

      const res = await fetcher({ baseUrl });
      expect(scope.isDone()).toEqual(true);
    });

    it('buffer', async () => {
      const scope = nock(baseUrl) //
        .post('/boop', 'test')
        .reply(200);

      const fetcher = buildCall()
        .path('/boop')
        .method('post')
        .body(Buffer.from('test'))
        .build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });

    it('stream', async () => {
      const pth = resolve(__dirname, '../../README.md');
      const stream = createReadStream(pth);

      const scope = nock(baseUrl) //
        .post('/boop', /^# typical-fetch.*/)
        .reply(200);

      const fetcher = buildCall()
        .path('/boop')
        .method('post')
        .body(stream)
        .build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });
  });

  describe('errors during call definition', () => {
    it('rejects multiple methods', async () => {
      expect(() =>
        buildCall() //
          .method('get')
          .method('post'),
      ).toThrow();
    });

    it('rejects multiple paths', async () => {
      expect(() =>
        buildCall() //
          .path('foo')
          .path('bar'),
      ).toThrow();
    });

    it('rejects multiple bodies', async () => {
      expect(() =>
        buildCall() //
          .body('foo')
          .body('bar'),
      ).toThrow();
    });

    it('throws when missing path', async () => {
      expect(() =>
        buildCall() //
          .build(),
      ).toThrow();
    });

    it('throws when missing method', async () => {
      expect(() =>
        buildCall() //
          .path('/')
          .build(),
      ).toThrow();
    });

    it('throws when using body with bodyless method', async () => {
      expect(() =>
        buildCall() //
          .path('/')
          .method('head')
          .body('test')
          .build(),
      ).toThrow();

      expect(() =>
        buildCall() //
          .path('/')
          .method('get')
          .body('test')
          .build(),
      ).toThrow();
    });

    it('throws when trying to add multiple parsers', async () => {
      expect(() =>
        buildCall()
          .path('/')
          .method('get')
          .parseText((e) => e)
          .parseText((e) => e),
      ).toThrow();

      expect(() =>
        buildCall()
          .path('/')
          .method('get')
          .parseText((e) => e)
          .parseJson((e) => e),
      ).toThrow();

      expect(() =>
        buildCall()
          .path('/')
          .method('get')
          .parseText((e) => e)
          .parseResponse((e) => e),
      ).toThrow();

      expect(() =>
        buildCall()
          .path('/')
          .method('get')
          .parseJson((e) => e)
          .parseJson((e) => e),
      ).toThrow();

      expect(() =>
        buildCall()
          .path('/')
          .method('get')
          .parseJson((e) => e)
          .parseText((e) => e),
      ).toThrow();

      expect(() =>
        buildCall()
          .path('/')
          .method('get')
          .parseJson((e) => e)
          .parseResponse((e) => e),
      ).toThrow();

      expect(() =>
        buildCall()
          .path('/')
          .method('get')
          .parseResponse((e) => e)
          .parseResponse((e) => e),
      ).toThrow();

      expect(() =>
        buildCall()
          .path('/')
          .method('get')
          .parseResponse((e) => e)
          .parseJson((e) => e),
      ).toThrow();

      expect(() =>
        buildCall()
          .path('/')
          .method('get')
          .parseResponse((e) => e)
          .parseText((e) => e),
      ).toThrow();
    });
  });

  describe('chaining', () => {
    it('copies thing', async () => {
      const getScope = nock(baseUrl) //
        .get('/boop')
        .reply(200);

      const postScope = nock(baseUrl) //
        .post('/boop')
        .reply(200);

      const rootFetcher = buildCall()
        .path('/boop')
        .map(() => 1);

      const get = rootFetcher
        .method('get')
        .map((n) => n + 3)
        .build();

      const post = rootFetcher
        .method('post')
        .map((n) => n + 1)
        .build();

      const getResult = await get({ baseUrl });
      const postResult = await post({ baseUrl });

      expect(getResult.body).toEqual(4);
      expect(postResult.body).toEqual(2);
      expect(getScope.isDone()).toEqual(true);
      expect(postScope.isDone()).toEqual(true);
    });

    it.todo('more chaining tests');
  });

  describe('arg merging', () => {
    it('smoke', async () => {
      const scope = nock(baseUrl)
        .get('/boop?sortOrder=desc')
        .matchHeader('authorization', 'tokan')
        .reply(200);

      const formData = new FormData();
      formData.append('boop', 'snoot');

      const fetcher = buildCall()
        .args<{ token: string }>()
        .headers((args) => ({ authorization: args.token }))
        .path('/boop')
        .method('get')
        .args<{ sortOrder: 'asc' | 'desc' }>()
        .query((e) => ({ sortOrder: e.sortOrder }))
        .build();

      await fetcher({ baseUrl, token: 'tokan', sortOrder: 'desc' });

      expect(scope.isDone()).toEqual(true);
    });
  });

  describe('error return values', () => {
    describe('http errors', () => {
      it('smoke test', async () => {
        const scope = nock(baseUrl) //
          .get('/boop')
          .reply(500);

        const fetcher = buildCall() //
          .path('/boop')
          .method('get')
          .build();

        const res = await fetcher({ baseUrl });

        expect(res.success).toEqual(false);
        expect(res.error instanceof TypicalHttpError).toEqual(true);
        invariant(res.error instanceof TypicalHttpError);
        expect(res.error.name).toEqual('TypicalHttpError');
        expect(res.error.status).toEqual(500);
        expect(res.error.statusText).toEqual('Internal Server Error');
        expect(res.error).toMatchInlineSnapshot(
          `[TypicalHttpError: 500 Internal Server Error]`,
        );
        expect(scope.isDone()).toEqual(true);
      });

      it('can interact with response object', async () => {
        const scope = nock(baseUrl) //
          .get('/boop')
          .reply(401, 'None shall pass!');

        const fetcher = buildCall() //
          .path('/boop')
          .method('get')
          .build();

        const res = await fetcher({ baseUrl });

        expect(res.success).toEqual(false);
        expect(res.error instanceof TypicalHttpError).toEqual(true);
        invariant(res.error instanceof TypicalHttpError);
        expect(res.error.name).toEqual('TypicalHttpError');

        const body = await res.error.res.text();

        expect(body).toEqual('None shall pass!');
      });
    });

    it('smoke 2', async () => {
      const scope = nock(baseUrl) //
        .get('/boop')
        .reply(200);

      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .map(() => {
          throw new Error('lol');
        })
        .build();

      const res = await fetcher({ baseUrl });

      expect(res.success).toEqual(false);
      expect(res?.error?.name).toEqual('TypicalWrappedError');
      expect(res?.error).toMatchInlineSnapshot(`[TypicalWrappedError: Error]`);
      expect(scope.isDone()).toEqual(true);
    });

    it('error mapper 1', async () => {
      const scope = nock(baseUrl) //
        .get('/boop')
        .reply(500);

      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .mapError((_err) => 'arrar!')
        .build();

      const res = await fetcher({ baseUrl });

      expect(res.success).toEqual(false);
      expect(res?.error).toEqual('arrar!');
      expect(res?.error).toMatchInlineSnapshot(`"arrar!"`);
      expect(scope.isDone()).toEqual(true);
    });

    it('multiple mappers', async () => {
      const scope = nock(baseUrl) //
        .get('/boop')
        .reply(500);

      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .mapError(() => 1)
        .mapError((prev) => prev + 1)
        .build();

      const res = await fetcher({ baseUrl });

      expect(res.success).toEqual(false);
      expect(res?.error).toEqual(2);
      expect(res?.error).toMatchInlineSnapshot(`2`);
      expect(scope.isDone()).toEqual(true);
    });

    it('async error mapper', async () => {
      const scope = nock(baseUrl) //
        .get('/boop')
        .reply(500);

      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .mapError(async (_err) => {
          await new Promise((res) => setTimeout(res, 1));
          return 'async arrar!';
        })
        .build();

      const res = await fetcher({ baseUrl });

      expect(res.success).toEqual(false);
      expect(res?.error).toEqual('async arrar!');
      expect(res?.error).toMatchInlineSnapshot(`"async arrar!"`);
      expect(scope.isDone()).toEqual(true);
    });

    it('mixed sync and async error mapper', async () => {
      const scope = nock(baseUrl) //
        .get('/boop')
        .reply(500);

      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .mapError((_) => 'error!')
        .mapError(async (err) => {
          await new Promise((res) => setTimeout(res, 1));
          return err.toUpperCase();
        })

        .mapError((err) => `${err}!!11`)
        .build();

      const res = await fetcher({ baseUrl });

      expect(res.success).toEqual(false);
      expect(res?.error).toEqual('ERROR!!!11');
      expect(res?.error).toMatchInlineSnapshot(`"ERROR!!!11"`);
      expect(scope.isDone()).toEqual(true);
    });

    it.todo('runtype failure');
  });
});

describe('buildUrl', () => {
  it('smoke test', () => {
    expect(buildUrl('http://foo.com', '').href).toEqual('http://foo.com/');

    expect(buildUrl('http://foo.com/', '/').href).toEqual('http://foo.com/');

    expect(buildUrl('http://foo.com', 'bar').href).toEqual(
      'http://foo.com/bar',
    );

    expect(buildUrl('http://foo.com/', 'bar').href).toEqual(
      'http://foo.com/bar',
    );

    expect(buildUrl('http://foo.com/', '/bar').href).toEqual(
      'http://foo.com/bar',
    );

    expect(buildUrl('http://foo.com', '/bar').href).toEqual(
      'http://foo.com/bar',
    );

    expect(buildUrl('http://foo.com/bar/', 'baz').href).toEqual(
      'http://foo.com/bar/baz',
    );

    expect(buildUrl('http://foo.com/bar', 'baz').href).toEqual(
      'http://foo.com/bar/baz',
    );

    expect(buildUrl('http://foo.com/bar/', '/baz').href).toEqual(
      'http://foo.com/bar/baz',
    );

    expect(buildUrl('http://foo.com/bar', '/baz/').href).toEqual(
      'http://foo.com/bar/baz',
    );
  });

  describe('baseUrl in builder', () => {
    it('Works when no other args', async () => {
      const scope = nock(baseUrl) //
        .get('/boop')
        .reply(200, 'OK');

      const fetcher = buildCall()
        .baseUrl(baseUrl)
        .path('/boop')
        .method('get')
        .build();

      const res = await fetcher();
      expect(res.success).toEqual(true);
      expect(res.body).toBeUndefined();

      expect(scope.isDone()).toEqual(true);
    });

    it('Works when other args', async () => {
      const scope = nock(baseUrl) //
        .get('/boop/1')
        .reply(200, 'OK');

      const fetcher = buildCall()
        .baseUrl(baseUrl)
        .args<{ id: number }>()
        .path((e) => `/boop/${e.id}`)
        .method('get')
        .build();

      const res = await fetcher({ id: 1 });
      expect(res.success).toEqual(true);
      expect(res.body).toBeUndefined();

      expect(scope.isDone()).toEqual(true);
    });
  });

  describe('misc', () => {
    it('actually returns void when no parser', async () => {
      const scope = nock(baseUrl) //
        .get('/boop')
        .reply(200, 'OK');

      const fetcher = buildCall() //
        .path('/boop')
        .method('get')
        .build();

      const res = await fetcher({ baseUrl });
      expect(res.success).toEqual(true);
      expect(res.body).toBeUndefined();

      expect(scope.isDone()).toEqual(true);
    });
  });

  describe('isFormData', () => {
    it('smoke test', () => {
      expect(isFormData(Buffer.from('asdf'))).toEqual(false);
      expect(isFormData(new URLSearchParams())).toEqual(false);
      expect(isFormData(undefined)).toEqual(false);
      expect(isFormData(new FormData())).toEqual(true);
      expect(
        isFormData({ toString: () => '[object FormData]' } as any),
      ).toEqual(true);
    });
  });
});
