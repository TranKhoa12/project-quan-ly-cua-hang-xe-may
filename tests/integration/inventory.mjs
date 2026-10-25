// Isolated native PostgreSQL. Never reads .env or connects to Supabase.
import EmbeddedPostgres from 'embedded-postgres';
import { Client } from 'pg';
import { readdirSync, readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const dir=resolve('.inventory-test',randomUUID()); mkdirSync(dir,{recursive:true});
const port=55439;
const password=randomUUID();
const server=new EmbeddedPostgres({databaseDir:dir,user:'postgres',password,port,persistent:true,postgresFlags:['-h','127.0.0.1'],initdbFlags:['--encoding=UTF8','--locale=C'],onLog:()=>{},onError:message=>{if(String(message).includes('ERROR:'))console.error(String(message));}});
const clients=[]; let checks=0; let failed=false;
async function connect(){const c=new Client({host:'127.0.0.1',port,user:'postgres',password,database:'postgres',statement_timeout:15000});await c.connect();clients.push(c);return c;}
function check(value,label){assert.ok(value,label);checks++;console.log('PASS '+label);}
try {
 await server.initialise(); await server.start(); const root=await connect();
 await root.query(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create schema extensions;
 create table auth.users(id uuid primary key);
 create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),not_after timestamptz);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
 grant usage on schema auth,public to authenticated,anon; grant execute on all functions in schema auth to authenticated,anon;`);
 for(const file of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort()){
  await root.query(readFileSync('supabase/migrations/'+file,'utf8'));console.log('Applied '+file);
 }
 const users={};
 for(const [name,role] of [['manager','manager'],['sales','sales'],['tech','technician'],['other','technician']]){
  const id=randomUUID(), session=randomUUID();
  await root.query('insert into auth.users values($1);',[id]);
  await root.query('insert into auth.sessions values($1,$2,null)',[session,id]);
  await root.query('insert into public.profiles(id,full_name,role,login_name) values($1,$2,$3,$2)',[id,name,role]);
  const c=await connect(); await c.query('set role authenticated');
  await c.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[id,JSON.stringify({sub:id,session_id:session})]);
  users[name]={c,id,session};
 }
 const cmd=async(c,action,payload,key=randomUUID())=>(await c.query('select public.garage_command($1,$2,$3) as r',[action,payload,key])).rows[0].r;
 const snap=async(c,section)=>(await c.query('select public.garage_snapshot($1) as r',[section])).rows[0].r;
 const m=users.manager.c,sales=users.sales.c,t=users.tech.c;
 const supplier=(await cmd(m,'supplier',{name:'Synthetic supplier',phone:''})).id;
 await cmd(m,'settings',{name:'Synthetic garage',phone:'000',address:'Test address',version:1});
 await assert.rejects(()=>cmd(m,'settings',{name:'Stale',phone:'',address:'',version:1}),/VERSION_CONFLICT/);check(true,'store settings reject stale version');
 const makePart=async(name,price=100)=> (await m.query("select public.create_part_with_terms($1,'Test','Test', $2, 0, 1, $3, true) as r",[name,price,randomUUID()])).rows[0].r.part.id;
 const p1=await makePart('Part one'),p2=await makePart('Part two');
 const purchase={supplierId:supplier,lines:[{partId:p1,quantity:10,cost:40},{partId:p2,quantity:1,cost:20}],paid:100,method:'cash'};
 const key=randomUUID(); const receipt=await cmd(m,'purchase',purchase,key);
 check((await cmd(m,'purchase',purchase,key)).id===receipt.id,'same purchase retry returns original receipt');
 await assert.rejects(()=>cmd(m,'purchase',{...purchase,paid:0},key),/IDEMPOTENCY_CONFLICT/);check(true,'same key with different payload rejected');
 check((await snap(m,'parts')).parts.find(p=>p.id===p1).stock===10,'receipt updates stock once');
 const bad={customer:'Test',method:'cash',lines:[{partId:p1,quantity:1,price:100},{partId:p2,quantity:2,price:100}]};
 await assert.rejects(()=>cmd(sales,'sale',bad),/INSUFFICIENT_STOCK/);
 check((await snap(m,'parts')).parts.find(p=>p.id===p1).stock===10,'multi-line failure leaves inventory unchanged');
 const last={customer:'Test',method:'cash',lines:[{partId:p2,quantity:1,price:100}]};
 const raced=await Promise.allSettled([cmd(m,'sale',last),cmd(sales,'sale',last)]);
 check(raced.filter(x=>x.status==='fulfilled').length===1 && raced.filter(x=>x.status==='rejected'&&/INSUFFICIENT_STOCK/.test(x.reason.message)).length===1,'two independent connections cannot sell same last item');
 const saleKey=randomUUID(); const sale=await cmd(sales,'sale',{customer:'Test',method:'transfer',lines:[{partId:p1,quantity:2,price:100}]},saleKey);
 check((await cmd(sales,'sale',{customer:'Test',method:'transfer',lines:[{partId:p1,quantity:2,price:100}]},saleKey)).id===sale.id,'sale retry does not debit stock or cash twice');
 const saleData=(await snap(m,'sales')).sales.find(x=>x.id===sale.id);
 const ret={itemId:saleData.items[0].id,quantity:1,resellable:true,reason:'Synthetic quality checked',method:'cash'};
 await cmd(m,'sale_return',ret);await assert.rejects(()=>cmd(m,'sale_return',{...ret,quantity:2}),/VALIDATION_ERROR/);check(true,'cumulative returns cannot exceed original quantity');
 await assert.rejects(()=>cmd(sales,'purchase',purchase),/FORBIDDEN/);await assert.rejects(()=>cmd(t,'sale',last),/FORBIDDEN/);check(true,'sales cannot receive stock; technician cannot sell');
 const staffParts=(await snap(sales,'parts')).parts;
 check(staffParts.every(p=>!Object.hasOwn(p,'cost')),'staff RPC payload excludes purchase costs');
 await assert.rejects(()=>sales.query('select * from public.part_costs').then(r=>{if(!r.rows.length)throw Error('denied')}),/denied|permission/);check(true,'RLS blocks direct cost query');
 const customer=(await cmd(sales,'customer',{name:'Synthetic customer',phone:'000',address:''})).id;
 const vehicle=(await cmd(sales,'vehicle',{customerId:customer,plate:'TEST-001',model:'Synthetic bike'})).id;
 await assert.rejects(()=>cmd(sales,'vehicle',{customerId:customer,plate:'test001',model:'Test'}),/duplicate key/);check(true,'normalized duplicate vehicle plate rejected');
 const repair=(await cmd(sales,'repair',{vehicleId:vehicle,issue:'Test issue',km:1,technicianId:users.tech.id})).id;
 await assert.rejects(()=>cmd(users.other.c,'transition',{id:repair,version:1,status:'ready',quality:'test'}),/FORBIDDEN/);check(true,'unassigned technician cannot change repair');
 await cmd(sales,'quote',{id:repair,version:1,labor:50,lines:[{partId:p1,quantity:1}]});
 await assert.rejects(()=>cmd(sales,'issue',{id:repair,version:2}),/INVALID_TRANSITION/);check(true,'unapproved quote cannot issue stock');
 await cmd(sales,'approve',{id:repair,version:2,confirmation:'Synthetic customer approved by phone'});
 await assert.rejects(()=>cmd(t,'transition',{id:repair,version:3,status:'ready',quality:'Checked'}),/PARTS_NOT_ISSUED/);check(true,'quality completion requires quoted parts to be issued');
 const issueKey=randomUUID();await cmd(sales,'issue',{id:repair,version:3},issueKey);await cmd(sales,'issue',{id:repair,version:3},issueKey);
 check((await snap(m,'repairs')).repairs.find(x=>x.id===repair).items.length===1,'repair issue retry creates one item/movement');
 const payPayload={id:repair,version:4,amount:150,method:'cash'};
 const pays=await Promise.allSettled([cmd(m,'payment',payPayload),cmd(sales,'payment',payPayload)]);
 check(pays.filter(x=>x.status==='fulfilled').length===1,'concurrent collections only collect once');
 await cmd(t,'transition',{id:repair,version:5,status:'ready',quality:'Synthetic quality check'});
 await cmd(sales,'transition',{id:repair,version:6,status:'delivered'});
 check((await snap(m,'repairs')).repairs.find(x=>x.id===repair).status==='delivered','receive quote approve issue collect quality and deliver completes');
 await assert.rejects(()=>cmd(sales,'payment',{id:repair,version:7,amount:1,method:'cash'}),/INVALID_TRANSITION/);check(true,'closed repair cannot collect again');
 const techSnapshot=await snap(t,'repairs');check(!Object.hasOwn(techSnapshot.repairs[0].customer,'phone'),'technician payload omits customer phone');
 const before=(await snap(m,'parts')).parts.find(x=>x.id===p1).stock;
 await assert.rejects(()=>cmd(m,'adjustment',{partId:p1,counted:3,expected:before+1,reason:'Test'}),/VERSION_CONFLICT/);check(true,'stale inventory count rejected');
 const stockVersion=(await snap(m,'parts')).parts.find(x=>x.id===p1).stock_version;
 await cmd(m,'adjustment',{partId:p1,counted:before+1,expected:before,stockVersion,reason:'Synthetic count'});
 const summary=(await snap(m,'reports')).summary;
 check(summary.received===450&&summary.spent===200&&summary.refunds===100&&summary.sales===300&&summary.repairs===150,'report separates sales, delivered repairs, collections, expenses and refunds');
 await cmd(m,'settings',{name:'Renamed garage',phone:'',address:'',version:2});
 check((await snap(m,'sales')).sales.find(x=>x.id===sale.id).store_snapshot.name==='Synthetic garage','issued documents keep original store name after rename');
 const payRace=await Promise.allSettled([cmd(m,'purchase_payment',{id:receipt.id,amount:320,method:'cash'}),cmd(m,'purchase_payment',{id:receipt.id,amount:320,method:'cash'})]);
 check(payRace.filter(x=>x.status==='fulfilled').length===1&&(await snap(m,'reports')).summary.payable===0,'concurrent supplier payments cannot overpay receipt');
 const oldStock=(await snap(m,'parts')).parts.find(x=>x.id===p1).stock;
 await cmd(m,'purchase',{supplierId:supplier,lines:[{partId:p1,quantity:2,cost:60}],paid:0,method:'cash'});
 check(Math.abs((await snap(m,'parts')).parts.find(x=>x.id===p1).cost-(oldStock*40+120)/(oldStock+2))<0.0001,'new receipt computes weighted average from current stock');
 const priceKey=randomUUID();await cmd(m,'part_settings',{partId:p1,expectedPrice:100,expectedMin:1,price:120,min:2},priceKey);
 await assert.rejects(()=>cmd(sales,'sale',{customer:'Test',method:'cash',lines:[{partId:p1,quantity:1,price:100}]}),/PRICE_CHANGED/);check(true,'stale displayed sale price cannot silently create a different invoice');
 // Inject a failure after writing inventory: transaction must roll everything back.
 const rowsBefore=(await root.query('select count(*) from public.sales_orders')).rows[0].count;
 const stockBefore=(await snap(m,'parts')).parts.find(x=>x.id===p1).stock;
 await root.query(`create function public.test_fail_cash() returns trigger language plpgsql as $$ begin raise exception 'INJECTED_FAILURE'; end $$;create trigger test_fail before insert on public.cash_entries for each row execute function public.test_fail_cash();`);
 const ledgerBefore=(await root.query('select (select count(*) from public.stock_movements) as moves,(select count(*) from public.sales_order_items) as items,(select count(*) from public.sale_item_costs) as costs')).rows[0];
 await assert.rejects(()=>cmd(m,'sale',{customer:'Test',method:'cash',lines:[{partId:p1,quantity:1,price:120}]}),/INJECTED_FAILURE/);
 check((await root.query('select count(*) from public.sales_orders')).rows[0].count===rowsBefore&&(await snap(m,'parts')).parts.find(x=>x.id===p1).stock===stockBefore,'failure after stock update rolls back sale, items, cost, movements and stock');
 assert.deepEqual((await root.query('select (select count(*) from public.stock_movements) as moves,(select count(*) from public.sales_order_items) as items,(select count(*) from public.sale_item_costs) as costs')).rows[0],ledgerBefore);check(true,'failure leaves no orphan item, cost snapshot or movement');
 await root.query('drop trigger test_fail on public.cash_entries');
 await root.query('update public.profiles set active=false where id=$1',[users.sales.id]);
 await assert.rejects(()=>cmd(sales,'customer',{name:'Denied',phone:'',address:''}),/UNAUTHENTICATED/);await assert.rejects(()=>snap(sales,'parts'),/UNAUTHENTICATED/);check(true,'disabled account loses read and write access with existing claims');
 await root.query('delete from auth.sessions where id=$1',[users.tech.session]);
 await assert.rejects(()=>snap(t,'repairs'),/UNAUTHENTICATED/);check(true,'revoked session cannot read business RPC');
 check((await t.query('select id from public.parts')).rows.length===0,'revoked session cannot bypass RPC using direct inventory reads');
 const anon=await connect();await anon.query('set role anon');await assert.rejects(()=>cmd(anon,'sale',last),/permission denied/);check(true,'anonymous role cannot execute business commands');
 console.log(`PASS ${checks} inventory checks on isolated PostgreSQL; no production connection.`);
} catch(error){console.error(error);failed=true;} finally {
 await Promise.allSettled(clients.map(c=>c.end()));
 if(process.platform==='win32'){
  const {pg_ctl}=await import('@embedded-postgres/windows-x64');
  try{execFileSync(pg_ctl,['-D',dir,'stop','-m','immediate','-w'],{windowsHide:true,stdio:'ignore'});}catch{}
 }else await server.stop();
}
process.exit(failed?1:0);
