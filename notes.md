# Notes

## todo

- Add kitchen sink tests
- test for redirect stuff
- jsdoc
- figure out good way of dealing with http errors / other
- Return status somehow?
- Helpers for isWrappedError etc?
- Add response object to the result?
- interceptor / event handlers?
- clean up where error handling happens
- test for throwing in weird places
- Have more custom errors? like at least JSON parsing at least?
- example wrapper for people that prefer throwing
- docs
- add response text if available to error
- tests for text/response in error object

## maybe

- More stuff supported in `fetchOptions`
- if you want text out of a response, you need to do `parseText(e => e)` which
  is a bit lame..
- should path default to `/` ?
- `.baseUrl(` should support function ?
- Wrap response in a proxy that throws if you try to edit/call it?
- Narrow after calling `method` and `path`?
- Support array as return value from `path`? As in
  `['users', userId,'pages',pageNum]` turns into
  `/users/${userId}/pages/${pageNum}`
- Make CallRecord typed?
- Weird / fancy `error(something)` return value to not have to throw in mappers
  etc?
