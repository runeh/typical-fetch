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

  const res = await getRequest(baseUrl);

  if (res.success) {
    console.log(res.response);
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

  const res = await getRequest(baseUrl);

  if (res.success) {
    console.log(res.response.slideshow);
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

  const res = await getRequest(baseUrl);

  if (res.success) {
    console.log(res.response);
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

  const res = await getRequest(baseUrl);

  if (res.success) {
    console.log(res.response);
  } else {
    console.log(res.error.name);
  }
}

async function main() {
  await getRequest();
  await jsonRequest();
  await jsonRequestWithMapper();
  await jsonRequestWithMultipleMappers();
}

main();
