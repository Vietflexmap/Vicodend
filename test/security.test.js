import test from 'node:test'; import assert from 'node:assert/strict';
import {issueToken,verifyToken} from '../src/security.js';
test('token is origin-bound and tamper evident',()=>{const s='x'.repeat(32),t=issueToken(s,'https://a.test');assert.equal(verifyToken(s,t,'https://a.test'),true);assert.equal(verifyToken(s,t,'https://b.test'),false);assert.equal(verifyToken(s,t+'x','https://a.test'),false)});
