import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash, createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { internalEmail } from '../../src/lib/auth/permissions.ts';

process.loadEnvFile('.env.local');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ref = new URL(url).hostname.split('.')[0];
if (process.env.SUPABASE_TEST_PROJECT_REF !== ref) throw new Error('Explicitly set SUPABASE_TEST_PROJECT_REF for a development/test project. Never run against a live shop.');
const base = process.env.AUTH_TEST_BASE_URL || 'http://127.0.0.1:3000';
if (!['127.0.0.1','localhost'].includes(new URL(base).hostname)) throw new Error('HTTP auth tests only allow a local application server.');
const options = { auth: { persistSession:false, autoRefreshToken:false } };
const admin = createClient(url,secret,options);
const anon = createClient(url,publicKey,options);
const nonce = randomBytes(5).toString('hex');
const users = [];
const rows = { customer:randomUUID(),vehicle:randomUUID(),part:randomUUID(),assigned:randomUUID(),other:randomUUID() };
const bucket = createHash('sha256').update(`integration-${nonce}`).digest('hex');
let assertions = 0;
function check(value,label) { assert(value,label); assertions++; console.log(`PASS ${label}`); }
async function ok(result,label) { if(result.error)throw new Error(`${label}: ${result.error.code || 'REQUEST_FAILED'}`);return result.data; }
async function fixture(role) {
  const username = `qa-${nonce}-${role}`;
  const password = `Qa-${randomBytes(24).toString('hex')}`;
  const created = await ok(await admin.auth.admin.createUser({ email:internalEmail(username),password,email_confirm:true }), 'create auth fixture');
  users.push({ id:created.user.id,username,role });
  await ok(await admin.from('profiles').insert({ id:created.user.id,login_name:username,full_name:`QA ${role}`,role,active:true }), 'create profile fixture');
  const client = createClient(url,publicKey,options);
  const auth = await ok(await client.auth.signInWithPassword({ email:internalEmail(username),password }), 'password login');
  const cookies = new Map();
  const ssr = createServerClient(url,publicKey,{cookies:{getAll:()=>[],setAll:values=>values.forEach(c=>cookies.set(c.name,c.value))}});
  await ok(await ssr.auth.setSession({access_token:auth.session.access_token,refresh_token:auth.session.refresh_token}), 'SSR cookie setup');
  return {id:created.user.id,username,password,client,cookie:[...cookies].map(([key,value])=>`${key}=${value}`).join('; ')};
}
async function get(path,cookie) { return fetch(new URL(path,base), { redirect:'manual',headers:cookie?{Cookie:cookie}:{},signal:AbortSignal.timeout(30000) }); }
function decode(text) { return text.replaceAll('&quot;','"').replaceAll('&#x27;',"'").replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>'); }
function actionFields(html, marker) {
  const form = [...html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)].find(m=>m[1].includes(marker));
  assert(form,'Expected server action form');
  const data = new FormData();
  for(const input of form[1].matchAll(/<input\b[^>]*>/g)) {
    const name=input[0].match(/name="([^"]+)"/)?.[1];
    if(name?.startsWith('$ACTION')) data.append(decode(name),decode(input[0].match(/value="([^"]*)"/)?.[1]||''));
  }
  return data;
}
async function post(path,data,cookie,origin=new URL(base).origin) {
  return fetch(new URL(path,base),{method:'POST',body:data,redirect:'manual',headers:{Origin:origin,...(cookie?{Cookie:cookie}:{})},signal:AbortSignal.timeout(30000)});
}
try {
  const manager = await fixture('manager');
  const sales = await fixture('sales');
  const technician = await fixture('technician');
  const loginHtml = await (await get('/login')).text();
  const loginFields = actionFields(loginHtml,'name="username"');
  loginFields.set('username',manager.username); loginFields.set('password',manager.password);
  const formLogin = await post('/login',loginFields);
  check(formLogin.status===303,'real login Server Action succeeds with username and password');
  const sessionCookies = formLogin.headers.getSetCookie();
  check(sessionCookies.some(c=>c.includes('HttpOnly')&&c.toLowerCase().includes('samesite=lax')),'server action sets HttpOnly SameSite cookies');
  const formCookie = sessionCookies.map(c=>c.split(';')[0]).join('; ');
  check((await get('/staff',formCookie)).status===200,'cookie from actual login grants authorized page access');
  const badFields = actionFields(loginHtml,'name="username"');
  badFields.set('username',manager.username);badFields.set('password','Incorrect-password-123');
  const badLogin = await post('/login',badFields);
  check(badLogin.status===200&&!(badLogin.headers.getSetCookie().some(c=>c.includes('base64-'))),'wrong password does not create a session');
  const csrfFields = actionFields(loginHtml,'name="username"');
  csrfFields.set('username',manager.username);csrfFields.set('password',manager.password);
  const crossOrigin = await post('/login',csrfFields,undefined,'https://untrusted.example');
  check(crossOrigin.status>=400&&!crossOrigin.headers.getSetCookie().some(c=>c.includes('base64-')),'cross-origin Server Action request rejected');
  const staffHtml = await (await get('/staff',formCookie)).text();
  const newUsername = `qa-${nonce}-created`;
  const createFields = actionFields(staffHtml,'name="username"');
  createFields.set('username',newUsername);createFields.set('password',`Qa-${randomBytes(24).toString('hex')}`);createFields.set('fullName','QA created via action');createFields.set('role','technician');
  await post('/staff',createFields,formCookie);
  const createdProfile = await ok(await admin.from('profiles').select('id,role').eq('login_name',newUsername).maybeSingle(),'check staff action');
  if(createdProfile)users.push({id:createdProfile.id,username:newUsername,role:'technician'});
  check(createdProfile?.role==='technician','manager creation Server Action creates Auth account and checked profile');
  const logoutFields = actionFields(staffHtml,'aria-label="Đăng xuất"');
  const logout = await post('/staff',logoutFields,formCookie);
  check(logout.status===303&&logout.headers.getSetCookie().some(c=>/Max-Age=0/i.test(c)),'logout Server Action clears session cookies');
  await ok(await admin.from('customers').insert({id:rows.customer,name:`QA ${nonce}`}), 'customer fixture');
  await ok(await admin.from('vehicles').insert({id:rows.vehicle,customer_id:rows.customer,plate:`QA${nonce}`,model:'QA test vehicle'}), 'vehicle fixture');
  await ok(await admin.from('parts').insert({id:rows.part,sku:`QA-${nonce}`,name:'QA part',sale_price:1000}), 'part fixture');
  await ok(await admin.from('part_costs').insert({part_id:rows.part,average_cost:500}), 'cost fixture');
  await ok(await admin.from('stock_balances').insert({part_id:rows.part,quantity:1}), 'stock fixture');
  await ok(await admin.from('repair_orders').insert([
    {id:rows.assigned,vehicle_id:rows.vehicle,issue:'QA assigned',technician_id:technician.id,created_by:manager.id},
    {id:rows.other,vehicle_id:rows.vehicle,issue:'QA other',technician_id:manager.id,created_by:manager.id},
  ]), 'repair fixtures');

  const anonymous = await anon.from('parts').select('id').eq('id',rows.part);
  check(!!anonymous.error || anonymous.data.length===0,'anonymous cannot read inventory');
  const cost = await sales.client.from('part_costs').select('*').eq('part_id',rows.part);
  check(!cost.error&&cost.data.length===0,'sales cannot read a populated cost row');
  const technicianRows = await ok(await technician.client.from('repair_orders').select('id').in('id',[rows.assigned,rows.other]),'technician scope');
  check(technicianRows.length===1&&technicianRows[0].id===rows.assigned,'technician only reads assigned repair');
  const customerRows = await ok(await technician.client.from('customers').select('id').eq('id',rows.customer),'technician customers');
  check(customerRows.length===0,'technician cannot read customer directory');
  const directEdit = await sales.client.from('profiles').update({role:'manager'}).eq('id',sales.id);
  check(!!directEdit.error,'direct self promotion rejected');
  const rpcEdit = await sales.client.rpc('update_staff_access',{p_id:sales.id,p_role:'manager',p_active:true});
  check(!!rpcEdit.error,'staff management RPC rejects sales caller');
  const selfDisable = await manager.client.rpc('update_staff_access',{p_id:manager.id,p_role:'technician',p_active:false});
  check(!!selfDisable.error,'manager cannot disable or demote self');
  const beforeDisable = await ok(await sales.client.from('parts').select('id').eq('id',rows.part),'active sales inventory');
  check(beforeDisable.length===1,'active sales reads allowed inventory');
  await ok(await manager.client.rpc('update_staff_access',{p_id:sales.id,p_role:'sales',p_active:false}),'deactivate staff');
  const afterDisable = await ok(await sales.client.from('parts').select('id').eq('id',rows.part),'inactive inventory');
  check(afterDisable.length===0,'old JWT loses inventory access after account deactivation');

  const anonymousPage = await get('/sales');
  check(anonymousPage.status===307&&new URL(anonymousPage.headers.get('location'),base).pathname==='/login','anonymous protected page redirects to login');
  check((await get('/staff',manager.cookie)).status===200,'manager can open staff management');
  const forbiddenTech = await get('/customers',technician.cookie);
  check(forbiddenTech.status===307&&new URL(forbiddenTech.headers.get('location'),base).pathname==='/access-denied','technician direct customer URL is denied');
  const inactivePage = await get('/parts',sales.cookie);
  check(inactivePage.status===307&&new URL(inactivePage.headers.get('location'),base).pathname==='/login','inactive user with existing cookie is denied');
  await ok(await manager.client.rpc('update_staff_access',{p_id:sales.id,p_role:'sales',p_active:true}),'reactivate staff');
  const salesStaff = await get('/staff',sales.cookie);
  check(salesStaff.status===307&&new URL(salesStaff.headers.get('location'),base).pathname==='/access-denied','sales direct administration URL is denied');
  check((await get('/repairs',technician.cookie)).status===200,'technician can open assigned-repairs page');
  const rateAccess = await anon.rpc('consume_auth_attempt',{p_bucket:bucket});
  check(!!rateAccess.error,'public caller cannot manipulate server login buckets');
  for(let i=1;i<=13;i++) {
    const allowed = await ok(await admin.rpc('consume_auth_attempt',{p_bucket:bucket}),'rate limit');
    assert.equal(allowed,i<=12);
  }
  check(true,'persistent login limiter rejects attempt 13');
  const signup = await anon.auth.signUp({email:internalEmail(`qa-${nonce}-blocked`),password:`Qa-${randomBytes(24).toString('hex')}`});
  if(signup.data.user)users.push({id:signup.data.user.id,username:`qa-${nonce}-blocked`,role:'unassigned'});
  check(!!signup.error&&!signup.data.user,'public signup disabled');
  console.log(`PASS ${assertions} integration checks using real user JWTs and local HTTP. No browser interaction was tested.`);
} finally {
  const errors=[];
  async function cleanup(result,label){if(result.error)errors.push(`${label}:${result.error.code||'ERROR'}`);}
  await cleanup(await admin.from('auth_attempt_limits').delete().eq('bucket',bucket),'rate bucket');
  const userBuckets=users.flatMap(u=>[`login-user:${u.username}`,`staff-create:${u.id}`,`staff-reset:${u.id}`,`password:${u.id}`]).map(value=>createHmac('sha256',secret).update(value).digest('hex'));
  if(userBuckets.length)await cleanup(await admin.from('auth_attempt_limits').delete().in('bucket',userBuckets),'fixture user buckets');
  const ids=users.map(u=>u.id);
  if(ids.length) await cleanup(await admin.from('audit_logs').delete().in('actor_id',ids),'audit');
  await cleanup(await admin.from('repair_orders').delete().in('id',[rows.assigned,rows.other]),'repairs');
  await cleanup(await admin.from('vehicles').delete().eq('id',rows.vehicle),'vehicle');
  await cleanup(await admin.from('customers').delete().eq('id',rows.customer),'customer');
  await cleanup(await admin.from('stock_balances').delete().eq('part_id',rows.part),'stock');
  await cleanup(await admin.from('part_costs').delete().eq('part_id',rows.part),'cost');
  await cleanup(await admin.from('parts').delete().eq('id',rows.part),'part');
  for(const u of users) {
    await cleanup(await admin.from('profiles').delete().eq('id',u.id),'profile');
    await cleanup(await admin.auth.admin.deleteUser(u.id),'auth user');
  }
  if(errors.length)throw new Error('Test cleanup needs review: '+errors.join(', '));
  console.log('Cleanup completed: temporary test accounts and rows removed.');
}
