import { URLSearchParams } from 'url';
import nock from 'nock';
import { buildCall } from '../index';

const baseUrl = 'http://www.example.org';

describe('typical-fetch', () => {
  describe('string path', () => {
    it('string path', async () => {
      const scope = nock(baseUrl).get('/boop').reply(200, 'text body');
      const fetcher = buildCall().withPath('/boop').withMethod('get').build();
      const res = await fetcher(baseUrl);
      expect(res).toBeTruthy();
      expect(scope.isDone()).toEqual(true);
    });

    it('callback path no args', async () => {
      const scope = nock(baseUrl).get('/boop').reply(200, 'text body');
      const fetcher = buildCall()
        .withMethod('get')
        .withPath(() => '/boop')
        .build();
      const res = await fetcher(baseUrl);
      expect(res).toBeTruthy();
      expect(scope.isDone()).toEqual(true);
    });

    it('callback path with args', async () => {
      const scope = nock(baseUrl).get('/name/rune').reply(200, 'text body');
      const fetcher = buildCall()
        .withMethod('get')
        .withArg<{ name: string }>()
        .withPath((e) => `/name/${e.name}`)
        .build();
      const res = await fetcher(baseUrl, { name: 'rune' });
      expect(res).toBeTruthy();
      expect(scope.isDone()).toEqual(true);
    });
  });

  describe('query parameters', () => {
    it('object', async () => {
      const scope = nock(baseUrl).get('/boop?foo=bar').reply(200, 'text body');
      const fetcher = buildCall()
        .withPath('/boop')
        .withMethod('get')
        .withQuery({ foo: 'bar' })
        .build();
      const res = await fetcher(baseUrl);
      expect(res).toBeTruthy();
      expect(scope.isDone()).toEqual(true);
    });

    it('multiple objects', async () => {
      const scope = nock(baseUrl)
        .get('/boop?foo=bar&baz=phlebotinum')
        .reply(200, 'text body');
      const fetcher = buildCall()
        .withPath('/boop')
        .withMethod('get')
        .withQuery({ foo: 'bar' })
        .withQuery({ baz: 'phlebotinum' })
        .build();
      const res = await fetcher(baseUrl);
      expect(res).toBeTruthy();
      expect(scope.isDone()).toEqual(true);
    });

    // fixme: is this what we want?
    it('multiple objects, uses both', async () => {
      const scope = nock(baseUrl)
        .get('/boop?foo=first&foo=second')
        .reply(200, 'text body');
      const fetcher = buildCall()
        .withPath('/boop')
        .withMethod('get')
        .withQuery({ foo: 'first' })
        .withQuery({ foo: 'second' })
        .build();
      const res = await fetcher(baseUrl);
      expect(res).toBeTruthy();
      expect(scope.isDone()).toEqual(true);
    });

    it('callback returning object', async () => {
      const scope = nock(baseUrl)
        .get('/boop?foo=first')
        .reply(200, 'text body');
      const fetcher = buildCall()
        .withPath('/boop')
        .withMethod('get')
        .withQuery(() => ({ foo: 'first' }))
        .build();
      const res = await fetcher(baseUrl);
      expect(res).toBeTruthy();
      expect(scope.isDone()).toEqual(true);
    });

    it('urlsearchparams as value', async () => {
      const scope = nock(baseUrl)
        .get('/boop?foo=first')
        .reply(200, 'text body');
      const fetcher = buildCall()
        .withPath('/boop')
        .withMethod('get')
        .withQuery(new URLSearchParams({ foo: 'first' }))
        .build();
      const res = await fetcher(baseUrl);
      expect(res).toBeTruthy();
      expect(scope.isDone()).toEqual(true);
    });

    it('urlsearchparams as callback', async () => {
      const scope = nock(baseUrl)
        .get('/boop?foo=first')
        .reply(200, 'text body');
      const fetcher = buildCall()
        .withPath('/boop')
        .withMethod('get')
        .withArg<{ value: string }>()
        .withQuery((e) => new URLSearchParams({ foo: e.value }))
        .build();
      const res = await fetcher(baseUrl, { value: 'first' });
      expect(res).toBeTruthy();
      expect(scope.isDone()).toEqual(true);
    });

    it('mixed object and params', async () => {
      const scope = nock(baseUrl)
        .get('/boop?foo=first&name=rune')
        .reply(200, 'text body');
      const fetcher = buildCall()
        .withPath('/boop')
        .withMethod('get')
        .withArg<{ value: string }>()
        .withQuery((e) => new URLSearchParams({ foo: e.value }))
        .withQuery({ name: 'rune' })
        .build();
      const res = await fetcher(baseUrl, { value: 'first' });
      expect(res).toBeTruthy();
      expect(scope.isDone()).toEqual(true);
    });
  });
});
