import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasAuthCookie } from '../src/lib/auth/cookie-presence.ts';
const url='https://exampleproject.supabase.co';
test('anonymous and unrelated cookies skip session initialization',()=>{
  for(const names of [[],['theme','other'],['sb-other-auth-token'],['sb-exampleproject-auth-token-code-verifier']])assert.equal(hasAuthCookie(names,url),false);
});
test('whole and chunked session cookies still go through verification',()=>{
  for(const names of [['sb-exampleproject-auth-token'],['sb-exampleproject-auth-token.0','sb-exampleproject-auth-token.1']])assert.equal(hasAuthCookie(names,url),true);
  assert.equal(hasAuthCookie(['sb-exampleproject-auth-token.not-a-chunk'],url),false);
});
test('missing or invalid project URL cannot imply a session',()=>{
  for(const value of [undefined,'','not-a-url'])assert.equal(hasAuthCookie(['sb-exampleproject-auth-token'],value),false);
});
