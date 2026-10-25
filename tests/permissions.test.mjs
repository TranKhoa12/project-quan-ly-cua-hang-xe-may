import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canAccess, normalizeUsername, internalEmail, isRole, validatePassword } from '../src/lib/auth/permissions.ts';

test('manager can access administration while sales and technician cannot',()=>{
  for (const section of ['dashboard','repairs','sales','parts','purchases','customers','cashbook','reports','staff','settings']) assert.equal(canAccess('manager',section),true);
  for (const role of ['sales','technician']) for (const section of ['staff','settings','purchases','cashbook','reports']) assert.equal(canAccess(role,section),false);
});
test('technician cannot access customer directory or sell; sales can enter both',()=>{
  for(const section of ['customers','sales']) {assert.equal(canAccess('technician',section),false);assert.equal(canAccess('sales',section),true);}
  assert.equal(canAccess('technician','repairs'),true);
});
test('unknown roles and nested or unknown routes fail closed',()=>{
  for(const role of ['admin',null,''])assert.equal(isRole(role),false);
  assert.equal(canAccess('admin','staff'),false);
  for(const path of ['staff/other','../staff','unknown',''])assert.equal(canAccess('manager',path),false);
});
test('username canonicalization prevents alternate domains and arbitrary email login',()=>{
  assert.equal(normalizeUsername('  QuanLy_01  '),'quanly_01');
  assert.equal(internalEmail('QUANLY'),'quanly@accounts.motocare.invalid');
  for(const value of ['ab','1quanly','user@example.com','a/b','quảnlý','a'.repeat(33),null])assert.throws(()=>normalizeUsername(value));
});
test('new passwords enforce length and letters plus numbers',()=>{
  assert.equal(validatePassword('a-secure-password-2026'),'a-secure-password-2026');
  for(const value of ['short1','a'.repeat(12),'1'.repeat(12),'a1'.repeat(65),null])assert.throws(()=>validatePassword(value));
});
