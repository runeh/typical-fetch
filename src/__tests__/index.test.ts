import { URLSearchParams } from 'url';
import nock from 'nock';
import { buildCall } from '../index';

const baseUrl = 'http://www.example.org';

describe('typical-fetch', () => {
  describe('string path', () => {
    it('string path', async () => {
      const scope = nock(baseUrl).get('/boop').reply(200, 'text body');
      const fetcher = buildCall().path('/boop').method('get').build();
      const res = await fetcher(baseUrl);
      expect(scope.isDone()).toEqual(true);
    });

    it('callback path no args', async () => {
      const scope = nock(baseUrl).get('/boop').reply(200, 'text body');
      const fetcher = buildCall()
        .method('get')
        .path(() => '/boop')
        .build();
      const res = await fetcher(baseUrl);
      expect(scope.isDone()).toEqual(true);
    });

    it('callback path with args', async () => {
      const scope = nock(baseUrl).get('/name/rune').reply(200, 'text body');
      const fetcher = buildCall()
        .method('get')
        .args<{ name: string }>()
        .path((e) => `/name/${e.name}`)
        .build();
      const res = await fetcher(baseUrl, { name: 'rune' });
      expect(scope.isDone()).toEqual(true);
    });
  });

  describe('query parameters', () => {
    it('object', async () => {
      const scope = nock(baseUrl).get('/boop?foo=bar').reply(200, 'text body');
      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .query({ foo: 'bar' })
        .build();
      const res = await fetcher(baseUrl);
      expect(scope.isDone()).toEqual(true);
    });

    it('multiple objects', async () => {
      const scope = nock(baseUrl)
        .get('/boop?foo=bar&baz=phlebotinum')
        .reply(200, 'text body');
      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .query({ foo: 'bar' })
        .query({ baz: 'phlebotinum' })
        .build();
      const res = await fetcher(baseUrl);
      expect(scope.isDone()).toEqual(true);
    });

    // fixme: is this what we want?
    it('multiple objects, uses both', async () => {
      const scope = nock(baseUrl)
        .get('/boop?foo=first&foo=second')
        .reply(200, 'text body');
      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .query({ foo: 'first' })
        .query({ foo: 'second' })
        .build();
      const res = await fetcher(baseUrl);
      expect(scope.isDone()).toEqual(true);
    });

    it('callback returning object', async () => {
      const scope = nock(baseUrl)
        .get('/boop?foo=first')
        .reply(200, 'text body');
      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .query(() => ({ foo: 'first' }))
        .build();
      const res = await fetcher(baseUrl);
      expect(scope.isDone()).toEqual(true);
    });

    it('urlsearchparams as value', async () => {
      const scope = nock(baseUrl)
        .get('/boop?foo=first')
        .reply(200, 'text body');
      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .query(new URLSearchParams({ foo: 'first' }))
        .build();
      const res = await fetcher(baseUrl);
      expect(scope.isDone()).toEqual(true);
    });

    it('urlsearchparams as callback', async () => {
      const scope = nock(baseUrl)
        .get('/boop?foo=first')
        .reply(200, 'text body');
      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .args<{ value: string }>()
        .query((e) => new URLSearchParams({ foo: e.value }))
        .build();
      const res = await fetcher(baseUrl, { value: 'first' });
      expect(scope.isDone()).toEqual(true);
    });

    it('mixed object and params', async () => {
      const scope = nock(baseUrl)
        .get('/boop?foo=first&name=rune')
        .reply(200, 'text body');
      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .args<{ value: string }>()
        .query((e) => new URLSearchParams({ foo: e.value }))
        .query({ name: 'rune' })
        .build();
      const res = await fetcher(baseUrl, { value: 'first' });
      expect(scope.isDone()).toEqual(true);
    });
  });

  describe('header parameters', () => {
    it('object', async () => {
      const scope = nock(baseUrl)
        .get('/boop')
        .reply(200, 'text body')
        .matchHeader('User-Agent', 'typical-fetch');
      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .headers({ 'User-Agent': 'typical-fetch' })
        .build();
      const res = await fetcher(baseUrl);
      expect(scope.isDone()).toEqual(true);
    });

    it('callback', async () => {
      const scope = nock(baseUrl)
        .get('/boop')
        .reply(200, 'text body')
        .matchHeader('User-Agent', 'typical-fetch');
      const fetcher = buildCall()
        .path('/boop')
        .method('get')
        .args<string>()
        .headers((ua) => ({ 'User-Agent': ua }))
        .build();
      const res = await fetcher(baseUrl, 'typical-fetch');
      expect(scope.isDone()).toEqual(true);
    });

    it('multiple objects', async () => {
      const scope = nock(baseUrl)
        .get('/boop')
        .reply(200, 'text body')
        .matchHeader('User-Agent', 'typical-fetch')
        .matchHeader('token', 'abcd');
      const fetcher = buildCall()
        .headers({ token: 'abcd' })
        .path('/boop')
        .method('get')
        .headers({ 'User-Agent': 'typical-fetch' })
        .build();
      const res = await fetcher(baseUrl);
      expect(scope.isDone()).toEqual(true);
    });
  });
});
