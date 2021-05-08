import { URL, URLSearchParams } from 'url';
import FormData from 'form-data';
import nock from 'nock';
import { Headers } from 'node-fetch';
import { buildCall } from '../index';
import { buildUrl, unwrapError } from '../common';
import invariant from 'ts-invariant';

const baseUrl = 'http://www.example.org';

describe('call builder', () => {
  describe('method', () => {
    it('get', async () => {
      const scope = nock(baseUrl).get('/boop').reply(200, 'OK');
      const fetcher = buildCall().path('/boop').method('get').build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });

    it('post', async () => {
      const scope = nock(baseUrl).post('/boop').reply(200, 'OK');
      const fetcher = buildCall().path('/boop').method('post').build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });

    it('head', async () => {
      const scope = nock(baseUrl).head('/boop').reply(200, 'OK');
      const fetcher = buildCall().path('/boop').method('head').build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });

    it('put', async () => {
      const scope = nock(baseUrl).put('/boop').reply(200, 'OK');
      const fetcher = buildCall().path('/boop').method('put').build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });

    it('delete', async () => {
      const scope = nock(baseUrl).delete('/boop').reply(200, 'OK');
      const fetcher = buildCall().path('/boop').method('delete').build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });

    it('patch', async () => {
      const scope = nock(baseUrl).patch('/boop').reply(200, 'OK');
      const fetcher = buildCall().path('/boop').method('patch').build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });
  });

  describe('path', () => {
    it('string path', async () => {
      const scope = nock(baseUrl).get('/boop').reply(200, 'OK');
      const fetcher = buildCall().path('/boop').method('get').build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });

    it('callback path no args', async () => {
      const scope = nock(baseUrl).get('/boop').reply(200, 'OK');
      const fetcher = buildCall()
        .method('get')
        .path(() => '/boop')
        .build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });

    it('callback path with args', async () => {
      const scope = nock(baseUrl).get('/name/rune').reply(200, 'OK');
      const fetcher = buildCall()
        .method('get')
        .args<{ name: string }>()
        .path((e) => `/name/${e.name}`)
        .build();

      await fetcher({ baseUrl, name: 'rune' });

      expect(scope.isDone()).toEqual(true);
    });

    it('merges with path from baseUrl when no leading slash', async () => {
      const scope = nock(baseUrl).get('/superpath/subpath').reply(200, 'OK');
      const fetcher = buildCall().method('get').path('subpath').build();

      await fetcher({ baseUrl: 'http://www.example.org/superpath' });
      expect(scope.isDone()).toEqual(true);
    });

    it('merges with path from baseUrl when no leading slash and baseUrl is URL', async () => {
      const scope = nock(baseUrl).get('/superpath/subpath').reply(200, 'OK');
      const fetcher = buildCall().method('get').path('subpath').build();

      await fetcher({ baseUrl: new URL('http://www.example.org/superpath') });
      expect(scope.isDone()).toEqual(true);
    });
  });

  describe('query parameters', () => {
    it('object', async () => {
      const scope = nock(baseUrl).get('/boop?foo=bar').reply(200, 'OK');
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
      const scope = nock(baseUrl).get('/boop?foo=first').reply(200, 'OK');
      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .query(() => ({ foo: 'first' }))
        .build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });

    it('urlsearchparams as value', async () => {
      const scope = nock(baseUrl).get('/boop?foo=first').reply(200, 'OK');
      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .query(new URLSearchParams({ foo: 'first' }))
        .build();

      await fetcher({ baseUrl });

      expect(scope.isDone()).toEqual(true);
    });

    it('urlsearchparams as callback', async () => {
      const scope = nock(baseUrl).get('/boop?foo=first').reply(200, 'OK');
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
      expect(res.error).toMatchInlineSnapshot(`[TypicalWrappedError: unknown]`);
      expect(scope.isDone()).toEqual(true);
    });

    it('expected error if malformed response', async () => {
      const scope = nock(baseUrl)
        .get('/boop')
        .reply(200, '{ malformed: "missing close brace ->" ');
      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .parseJson((e) => {
          return e as { malformed: string };
        })
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

    it.todo('parser that gets args passed in');
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

    it.todo('mapper that gets args passed in');
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

    it.todo('stream test');
    it.todo('buffer');
  });

  describe('errors during call definition', () => {
    it('rejects multiple methods', async () => {
      expect(() => buildCall().method('get').method('post')).toThrow();
    });

    it('rejects multiple paths', async () => {
      expect(() => buildCall().path('foo').path('bar')).toThrow();
    });

    it('rejects multiple bodies', async () => {
      expect(() => buildCall().body('foo').body('bar')).toThrow();
    });

    it('rejects when missing path', async () => {
      expect(() => buildCall().build()).toThrow();
    });

    it('rejects when missing method', async () => {
      expect(() => buildCall().path('/').build()).toThrow();
    });

    it('rejects when using body with bodyless method', async () => {
      expect(() =>
        buildCall().path('/').method('head').body('test').build(),
      ).toThrow();

      expect(() =>
        buildCall().path('/').method('get').body('test').build(),
      ).toThrow();

      expect(() =>
        buildCall().path('/').method('delete').body('test').build(),
      ).toThrow();
    });
  });

  describe('chaining', () => {
    it('copies thing', async () => {
      const getScope = nock(baseUrl).get('/boop').reply(200);
      const postScope = nock(baseUrl).post('/boop').reply(200);

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

    it.todo('more arg merging tests?');
  });

  describe('error return values', () => {
    it('smoke 1', async () => {
      const scope = nock(baseUrl).get('/boop').reply(500);
      const fetcher = buildCall().path('/boop').method('get').build();

      const res = await fetcher({ baseUrl });

      expect(res.success).toEqual(false);
      expect(res?.error?.name).toEqual('TypicalHttpError');
      expect(res?.error).toMatchInlineSnapshot(
        `[TypicalHttpError: Status: 500]`,
      );
      expect(scope.isDone()).toEqual(true);
    });

    it('smoke 2', async () => {
      const scope = nock(baseUrl).get('/boop').reply(200);
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
      expect(res?.error).toMatchInlineSnapshot(
        `[TypicalWrappedError: unknown]`,
      );
      expect(scope.isDone()).toEqual(true);
    });

    it('error mapper 1', async () => {
      const scope = nock(baseUrl).get('/boop').reply(500);
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

    it.todo('runtype failure');
    it.todo('malformed json failure');
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

  describe('misc', () => {
    it('actually returns void when no parser', async () => {
      const scope = nock(baseUrl).get('/boop').reply(200, 'OK');
      const fetcher = buildCall().path('/boop').method('get').build();

      const res = await fetcher({ baseUrl });
      expect(res.success).toEqual(true);
      expect(res.body).toBeUndefined();

      expect(scope.isDone()).toEqual(true);
    });
  });
});
