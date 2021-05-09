/* eslint-disable no-console */
import { buildCall } from '../src/index';

const baseUrl = 'https://httpbin.org';

export interface HttpBinJsonRoot {
  slideshow: HttpBinJsonSlideshow;
}

export interface HttpBinJsonSlideshow {
  author: string;
  date: string;
  slides: HttpBinJsonSlide[];
  title: string;
}

export interface HttpBinJsonSlide {
  title: string;
  type: string;
  items?: string[];
}

/**
 * function to do a basic GET request
 */
async function getRequest() {
  const getRequest = buildCall().path('/get').method('get').build();

  const res = await getRequest({ baseUrl });

  if (res.success) {
    console.log(res.body);
  } else {
    console.log(res.error.name);
  }
}

/**
 * function use JSON parsing
 */
async function jsonRequest() {
  const getRequest = buildCall()
    .path('/json')
    .method('get')
    // This "parser" just assumes the format of the JSON. Doesn't validate it.
    .parseJson((data) => data as HttpBinJsonRoot)
    .build();

  const res = await getRequest({ baseUrl });

  if (res.success) {
    console.log(res.body.slideshow);
  } else {
    console.log(res.error.name);
  }
}

/**
 * function use JSON parsing with mapper
 */
async function jsonRequestWithMapper() {
  const getRequest = buildCall()
    .path('/json')
    .method('get')
    // This "parser" just assumes the format of the JSON. Doesn't validate it.
    .parseJson((data) => data as HttpBinJsonRoot)
    .map((e) => e.slideshow.title.toUpperCase())
    .build();

  const res = await getRequest({ baseUrl });

  if (res.success) {
    console.log(res.body);
  } else {
    console.log(res.error.name);
  }
}

/**
 * function use JSON parsing with multiple mappers
 */
async function jsonRequestWithMultipleMappers() {
  const getRequest = buildCall()
    .path('/json')
    .method('get')
    // This "parser" just assumes the format of the JSON. Doesn't validate it.
    .parseJson((data) => data as HttpBinJsonRoot)
    .map((e) => e.slideshow.title)
    .map((e) => e.toUpperCase())
    .build();

  const res = await getRequest({ baseUrl });

  if (res.success) {
    console.log(res.body);
  } else {
    console.log(res.error.name);
  }
}

const fetcher = buildCall()
  .method('get')
  .headers({ 'user-agent': 'typical-fetch' })
  .path('/user-names')
  .parseJson((data) => {
    if (Array.isArray(data) && data.every((e) => typeof e === 'string')) {
      return data as string[];
    } else {
      throw new Error('Unexpected data');
    }
  })
  .build();

async function main() {
  await getRequest();
  await jsonRequest();
  await jsonRequestWithMapper();
  await jsonRequestWithMultipleMappers();
}

main();

const baseBuilder = buildCall()
  .args<{ apiToken: string }>()
  .baseUrl('https://example.org/api')
  .headers((args) => ({
    'user-agent': 'typical-fetch',
    authorizaton: `Bearer ${args.apiToken}`,
  }));

const getUser = baseBuilder
  .args<{ id: string }>()
  .method('get')
  .path((args) => `/user/${args.id}`)
  .parseJson((data) => {
    return parseUsers(data);
  })
  .build();

const createUser = baseBuilder
  .args<{ name: string; birthDate: string }>()
  .method('post')
  .path('/user')
  .body((args) => {
    return { name: args.name, birthDate: args.birthDate };
  })
  .parseJson((data) => parseUser(data))
  .build();

const createResult = await createUser({
  apiToken: 'asdf',
  name: 'Rune',
  birthDate: '1975-05-24',
});

const userId = createResult.body;
