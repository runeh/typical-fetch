import { URLSearchParams } from 'url';
import FormData from 'form-data';
import nock from 'nock';
import { buildCall } from '../index';

const baseUrl = 'http://www.example.org';

describe('typical-fetch', () => {
  describe('string path', () => {
    it('string path', async () => {
      const scope = nock(baseUrl).get('/boop').reply(200, 'text body');
      const fetcher = buildCall().path('/boop').method('get').build();

      await fetcher(baseUrl);

      expect(scope.isDone()).toEqual(true);
    });

    it('callback path no args', async () => {
      const scope = nock(baseUrl).get('/boop').reply(200, 'text body');
      const fetcher = buildCall()
        .method('get')
        .path(() => '/boop')
        .build();

      await fetcher(baseUrl);

      expect(scope.isDone()).toEqual(true);
    });

    it('callback path with args', async () => {
      const scope = nock(baseUrl).get('/name/rune').reply(200, 'text body');
      const fetcher = buildCall()
        .method('get')
        .args<{ name: string }>()
        .path((e) => `/name/${e.name}`)
        .build();

      await fetcher(baseUrl, { name: 'rune' });

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

      await fetcher(baseUrl);

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

      await fetcher(baseUrl);

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

      await fetcher(baseUrl);

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

      await fetcher(baseUrl);

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

      await fetcher(baseUrl);

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

      await fetcher(baseUrl, { value: 'first' });

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

      await fetcher(baseUrl, { value: 'first' });

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

      await fetcher(baseUrl);

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

      await fetcher(baseUrl, 'typical-fetch');

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

      await fetcher(baseUrl);

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

      const res = await fetcher(baseUrl);

      expect(res.user.name).toEqual('Rune');
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

      const res = await fetcher(baseUrl);

      expect(res.name).toEqual('Rune');
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

      const res = await fetcher(baseUrl);

      expect(res).toEqual('RUNE');
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

      const res = await fetcher(baseUrl);

      expect(res).toEqual('RUNE');
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

      await fetcher(baseUrl);

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

      await fetcher(baseUrl);

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

      await fetcher(baseUrl);

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

      await fetcher(baseUrl);

      expect(scope.isDone()).toEqual(true);
    });

    it.todo('stream test');
    it.todo('buffer');
  });
});
