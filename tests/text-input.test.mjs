import test from 'node:test';
import assert from 'node:assert/strict';
import {capitalizeWords} from '../src/lib/text-input.ts';

test('capitalizes Vietnamese word initials while preserving spacing, acronyms and numbers',()=>{
 assert.equal(capitalizeWords('nhớt xe máy'), 'Nhớt Xe Máy');
 assert.equal(capitalizeWords('  phụ   tùng\nhonda'), '  Phụ   Tùng\nHonda');
 assert.equal(capitalizeWords('NGK 10W-40 AB125'), 'NGK 10W-40 AB125');
 assert.equal(capitalizeWords('đại lý (sài-gòn)'), 'Đại Lý (Sài-Gòn)');
 assert.equal(capitalizeWords('đại lý'), 'Đại Lý');
 assert.equal(capitalizeWords('0123 456 789'), '0123 456 789');
 assert.equal(capitalizeWords(''), '');
});
