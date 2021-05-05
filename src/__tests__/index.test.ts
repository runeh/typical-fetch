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
});
