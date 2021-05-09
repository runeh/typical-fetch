# Notes

## todo

- pass response to mappers? That seems good if you need to know redirect url or
  some header or whatever. Or should people be using parseResponse in that case?
- Add kitchen sink tests
- follow redirects?
- test for redirect stuff
- jsdoc
- figure out good way of dealing with http errors / other
- Return status somehow?
- Helpers for isWrappedError etc?
- Add response object to the result?
- test for file uploads
- interceptor / event handlers?
- clean up where error handling happens
- test for throwing in weird places
- Have more custom errors? like at least JSON parsing at least?
- should path default to `/` ?
- example wrapper for people that prefer throwing
- add example that talks to https://jsonplaceholder.typicode.com
- update this file
- docs
- add response text if available to error
- should there be a `fetchInit` method if you need to pass extra fetch stuff?
  Useful for `redirect`, `mode` and `credentials`.
- if you want text out of a response, you need to do `parseText(e => e)` which
  is a bit lame..

## maybe

- `.baseUrl(` should support function ?
- Wrap response in a proxy that throws if you try to edit/call it?
- Narrow after calling `method` and `path`?
- Support array as return value from `path`? As in
  `['users', userId,'pages',pageNum]` turns into
  `/users/${userId}/pages/${pageNum}`
- Make CallRecord typed?
- Weird / fancy `error(something)` return value to not have to throw in mappers
  etc?
