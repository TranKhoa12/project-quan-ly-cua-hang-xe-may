begin;
create table public.store_settings (
 id boolean primary key default true check(id), name text not null default 'Cửa hàng xe máy',
 phone text not null default '', address text not null default '', version integer not null default 1
);
insert into public.store_settings(id) values(true);
create table public.suppliers(id uuid primary key default gen_random_uuid(),name text not null check(length(trim(name)) between 1 and 180),phone text not null default '',created_at timestamptz not null default now());
create table public.purchase_receipts(
 id uuid primary key default gen_random_uuid(),code bigint generated always as identity unique,
 supplier_id uuid not null references public.suppliers(id),supplier_snapshot jsonb not null,store_snapshot jsonb not null,
 total bigint not null check(total>=0),created_by uuid not null references public.profiles(id),created_at timestamptz not null default now()
);
create table public.purchase_items(id uuid primary key default gen_random_uuid(),purchase_id uuid not null references public.purchase_receipts(id),part_id uuid not null references public.parts(id),name_snapshot text not null,quantity integer not null check(quantity>0),unit_cost bigint not null check(unit_cost>=0));
create table public.cash_entries(
 id uuid primary key default gen_random_uuid(),direction text not null check(direction in ('in','out')),amount bigint not null check(amount>0),
 method text not null check(method in ('cash','transfer')),reason text not null,
 purchase_id uuid references public.purchase_receipts(id),sale_id uuid references public.sales_orders(id),repair_id uuid references public.repair_orders(id),
 created_by uuid not null references public.profiles(id),created_at timestamptz not null default now()
);
create table public.garage_requests(actor_id uuid not null references public.profiles(id),request_id uuid not null,action text not null,payload jsonb not null,result jsonb not null,created_at timestamptz not null default now(),primary key(actor_id,request_id));
create table public.repair_quotes(id uuid primary key default gen_random_uuid(),repair_id uuid not null references public.repair_orders(id),version integer not null,items jsonb not null, labor bigint not null check(labor>=0),total bigint not null check(total>=0),customer_confirmation text,approved_at timestamptz,created_by uuid not null references public.profiles(id),created_at timestamptz not null default now(),unique(repair_id,version));
create table public.repair_item_costs(item_id uuid primary key references public.repair_part_items(id),unit_cost numeric(18,4) not null check(unit_cost>=0));
create table public.sale_returns(id uuid primary key default gen_random_uuid(),item_id uuid not null references public.sales_order_items(id),quantity integer not null check(quantity>0),refund bigint not null check(refund>=0),reason text not null,created_by uuid not null references public.profiles(id),created_at timestamptz not null default now());
alter table public.repair_orders add column version integer not null default 1,add column km integer not null default 0 check(km>=0),add column customer_snapshot jsonb not null default '{}',add column store_snapshot jsonb not null default '{}',add column quality_note text;
alter table public.sales_orders add column store_snapshot jsonb not null default '{}';
alter table public.stock_movements add column purchase_id uuid references public.purchase_receipts(id),add column return_id uuid references public.sale_returns(id);
create index purchase_items_receipt on public.purchase_items(purchase_id);
create index cash_purchase on public.cash_entries(purchase_id);
create index cash_repair on public.cash_entries(repair_id);
create index returns_item on public.sale_returns(item_id);
create index quotes_repair on public.repair_quotes(repair_id,version desc);
alter table public.stock_balances add column version bigint not null default 1;
create function public.bump_stock_version() returns trigger language plpgsql set search_path='' as $$
begin new.version:=old.version+1; return new; end $$;
create trigger stock_version before update on public.stock_balances for each row execute function public.bump_stock_version();
revoke all on function public.bump_stock_version() from public,anon,authenticated;

do $$ declare t text; begin
 foreach t in array array['store_settings','suppliers','purchase_receipts','purchase_items','cash_entries','garage_requests','repair_quotes','repair_item_costs','sale_returns'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
 end loop;
end $$;
-- Every new data path checks the live session, including read-only RPCs.
create function public.garage_actor() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a jsonb; begin a:=public.current_staff_actor(); if a is null then raise exception 'UNAUTHENTICATED' using errcode='42501'; end if; return a; end $$;
create function public.garage_integer(v jsonb,lo bigint,hi bigint) returns bigint language plpgsql immutable set search_path='' as $$
declare n numeric; begin
 if v is null or jsonb_typeof(v)<>'number' then raise exception 'VALIDATION_ERROR'; end if;
 n:=(v#>>'{}')::numeric;
 if n<>trunc(n) or n<lo or n>hi then raise exception 'VALIDATION_ERROR'; end if; return n::bigint;
end $$;
create function public.garage_text(v jsonb,lo integer,hi integer) returns text language plpgsql immutable set search_path='' as $$
declare s text; begin
 if v is null or jsonb_typeof(v)<>'string' then raise exception 'VALIDATION_ERROR'; end if;
 s:=trim(v#>>'{}'); if length(s)<lo or length(s)>hi then raise exception 'VALIDATION_ERROR'; end if; return s;
end $$;

create function public.garage_command(p_action text,p_payload jsonb,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 a jsonb:=public.garage_actor(); actor uuid:=(a->>'id')::uuid; role_name text:=a->>'role';
 old public.garage_requests; result jsonb; doc uuid; item_id uuid; part uuid; q integer; stock integer; cost numeric; price bigint;
 total bigint:=0; paid bigint:=0; amount bigint; method text; reason text; s text; line jsonb; lines jsonb; snapshot jsonb;
 r public.repair_orders; quote public.repair_quotes; ver integer; sale_item public.sales_order_items; returned integer;
begin
 if p_request_id is null or p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>100000 then raise exception 'VALIDATION_ERROR'; end if;
 if role_name<>'manager' and (role_name<>'sales' or p_action not in ('customer','vehicle','repair','quote','approve','issue','payment','transition','sale')) and not(role_name='technician' and p_action='transition') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text||p_request_id::text,0));
 select * into old from public.garage_requests where actor_id=actor and request_id=p_request_id;
 if found then
  if old.action<>p_action or old.payload<>p_payload then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  return old.result;
 end if;
 select to_jsonb(st)-'id' into snapshot from public.store_settings st where id;
 if p_action='settings' then
  s:=public.garage_text(p_payload->'name',1,100);
  update public.store_settings set name=s,phone=public.garage_text(p_payload->'phone',0,30),address=public.garage_text(p_payload->'address',0,250),version=version+1
  where id and version=public.garage_integer(p_payload->'version',1,2147483646);
  if not found then raise exception 'VERSION_CONFLICT'; end if;
 elsif p_action='supplier' then
  insert into public.suppliers(name,phone) values(public.garage_text(p_payload->'name',1,180),public.garage_text(p_payload->'phone',0,30)) returning id into doc;
 elsif p_action='part_settings' then
  doc:=(p_payload->>'partId')::uuid;
  perform 1 from public.stock_balances where part_id=doc for update;
  select sale_price,minimum_stock into price,stock from public.parts where id=doc for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if price<>public.garage_integer(p_payload->'expectedPrice',0,1000000000) or stock<>public.garage_integer(p_payload->'expectedMin',0,1000000) then raise exception 'VERSION_CONFLICT'; end if;
  update public.parts set sale_price=public.garage_integer(p_payload->'price',0,1000000000),minimum_stock=public.garage_integer(p_payload->'min',0,1000000) where id=doc;
 elsif p_action='customer' then
  insert into public.customers(name,phone,address) values(public.garage_text(p_payload->'name',1,180),public.garage_text(p_payload->'phone',0,30),public.garage_text(p_payload->'address',0,250)) returning id into doc;
 elsif p_action='vehicle' then
  if not exists(select 1 from public.customers where id=(p_payload->>'customerId')::uuid) then raise exception 'NOT_FOUND'; end if;
  s:=upper(public.garage_text(p_payload->'plate',1,30));
  if regexp_replace(s,'[^A-Z0-9]','','g')='' then raise exception 'VALIDATION_ERROR'; end if;
  insert into public.vehicles(customer_id,plate,model) values((p_payload->>'customerId')::uuid,s,public.garage_text(p_payload->'model',1,100)) returning id into doc;
 elsif p_action='purchase' or p_action='sale' then
  lines:=p_payload->'lines';
  if jsonb_typeof(lines) is distinct from 'array' or jsonb_array_length(lines) not between 1 and 100 then raise exception 'VALIDATION_ERROR'; end if;
  if (select count(distinct x->>'partId') from jsonb_array_elements(lines) x)<>jsonb_array_length(lines) then raise exception 'DUPLICATE_LINES'; end if;
  -- All inventory operations acquire stock rows in the same UUID order.
  for line in select value from jsonb_array_elements(lines) order by (value->>'partId')::uuid loop
   part:=(line->>'partId')::uuid; q:=public.garage_integer(line->'quantity',1,1000000);
   select quantity into stock from public.stock_balances where part_id=part for update;
   if not found or not exists(select 1 from public.parts where id=part and active) then raise exception 'NOT_FOUND'; end if;
   select sale_price into price from public.parts where id=part for share;
   if p_action='sale' then
    if stock<q then raise exception 'INSUFFICIENT_STOCK'; end if;
    if price<>public.garage_integer(line->'price',0,1000000000) then raise exception 'PRICE_CHANGED'; end if;
   else
    price:=public.garage_integer(line->'cost',0,1000000000);
    if stock>2147483647-q then raise exception 'VALIDATION_ERROR'; end if;
   end if;
   total:=total+q::bigint*price;
   if total>1000000000000 then raise exception 'VALIDATION_ERROR'; end if;
  end loop;
  method:=public.garage_text(p_payload->'method',1,20);
  if method not in ('cash','transfer') then raise exception 'VALIDATION_ERROR'; end if;
  if p_action='purchase' then
   select to_jsonb(su) into line from public.suppliers su where id=(p_payload->>'supplierId')::uuid;
   if line is null then raise exception 'NOT_FOUND'; end if;
   amount:=public.garage_integer(p_payload->'paid',0,total);
   insert into public.purchase_receipts(supplier_id,supplier_snapshot,store_snapshot,total,created_by) values((p_payload->>'supplierId')::uuid,line,snapshot,total,actor) returning id into doc;
  else
   amount:=total;
   insert into public.sales_orders(idempotency_key,customer_name,total,payment_method,created_by,store_snapshot) values(p_request_id,coalesce(nullif(public.garage_text(p_payload->'customer',0,180),''),'Khách lẻ'),total,method,actor,snapshot) returning id into doc;
  end if;
  for line in select value from jsonb_array_elements(lines) order by (value->>'partId')::uuid loop
   part:=(line->>'partId')::uuid; q:=(line->>'quantity')::integer;
   select quantity into stock from public.stock_balances where part_id=part;
   select average_cost into cost from public.part_costs where part_id=part for update;
   if not found then raise exception 'MISSING_COST'; end if;
   select name,sale_price into s,price from public.parts where id=part;
   if p_action='purchase' then
    price:=(line->>'cost')::bigint;
    insert into public.purchase_items(purchase_id,part_id,name_snapshot,quantity,unit_cost) values(doc,part,s,q,price);
    update public.part_costs set average_cost=round((stock::numeric*cost+q::numeric*price)/(stock::numeric+q),4) where part_id=part;
    update public.stock_balances set quantity=quantity+q where part_id=part;
    insert into public.stock_movements(part_id,quantity,reason,purchase_id,created_by) values(part,q,'Nhập hàng',doc,actor);
   else
    insert into public.sales_order_items(sale_id,part_id,name_snapshot,quantity,unit_price) values(doc,part,s,q,price) returning id into item_id;
    insert into public.sale_item_costs(item_id,unit_cost) values(item_id,cost);
    update public.stock_balances set quantity=quantity-q where part_id=part;
    insert into public.stock_movements(part_id,quantity,reason,sale_id,created_by) values(part,-q,'Bán tại quầy',doc,actor);
   end if;
  end loop;
  if amount>0 then
   insert into public.cash_entries(direction,amount,method,reason,purchase_id,sale_id,created_by) values(case when p_action='purchase' then 'out' else 'in' end,amount,method,case when p_action='purchase' then 'Thanh toán nhập hàng' else 'Thu bán hàng' end,case when p_action='purchase' then doc end,case when p_action='sale' then doc end,actor);
   if p_action='sale' then insert into public.payments(idempotency_key,sale_id,amount,method,created_by) values(p_request_id,doc,amount,method,actor); end if;
  end if;
 elsif p_action='purchase_payment' then
  doc:=(p_payload->>'id')::uuid;
  select pr.total into total from public.purchase_receipts pr where id=doc for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  select coalesce(sum(ce.amount),0) into paid from public.cash_entries ce where purchase_id=doc;
  amount:=public.garage_integer(p_payload->'amount',1,total-paid);
  method:=public.garage_text(p_payload->'method',1,20); if method not in ('cash','transfer') then raise exception 'VALIDATION_ERROR'; end if;
  insert into public.cash_entries(direction,amount,method,reason,purchase_id,created_by) values('out',amount,method,'Thanh toán công nợ nhập hàng',doc,actor);
 elsif p_action='expense' then
  amount:=public.garage_integer(p_payload->'amount',1,1000000000); reason:=public.garage_text(p_payload->'reason',1,500);
  method:=public.garage_text(p_payload->'method',1,20); if method not in ('cash','transfer') then raise exception 'VALIDATION_ERROR'; end if;
  insert into public.cash_entries(direction,amount,method,reason,created_by) values('out',amount,method,reason,actor) returning id into doc;
 elsif p_action='adjustment' then
  part:=(p_payload->>'partId')::uuid; q:=public.garage_integer(p_payload->'counted',0,1000000); reason:=public.garage_text(p_payload->'reason',1,500);
  select quantity into stock from public.stock_balances where part_id=part for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if stock<>public.garage_integer(p_payload->'expected',0,2147483647) or (select version from public.stock_balances where part_id=part)<>public.garage_integer(p_payload->'stockVersion',1,9007199254740991) then raise exception 'VERSION_CONFLICT'; end if;
  if q<>stock then
   update public.stock_balances set quantity=q where part_id=part;
   insert into public.stock_movements(part_id,quantity,reason,created_by) values(part,q-stock,'Kiểm kê: '||reason,actor) returning id into doc;
  end if;
 elsif p_action='sale_return' then
  select * into sale_item from public.sales_order_items where id=(p_payload->>'itemId')::uuid for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  select coalesce(sum(sr.quantity),0) into returned from public.sale_returns sr where sr.item_id=sale_item.id;
  q:=public.garage_integer(p_payload->'quantity',1,sale_item.quantity-returned); reason:=public.garage_text(p_payload->'reason',1,500);
  if p_payload->'resellable' is distinct from 'true'::jsonb then raise exception 'QUALITY_CONFIRMATION_REQUIRED'; end if;
  method:=public.garage_text(p_payload->'method',1,20); if method not in ('cash','transfer') then raise exception 'VALIDATION_ERROR'; end if;
  part:=sale_item.part_id; amount:=q::bigint*sale_item.unit_price;
  select quantity into stock from public.stock_balances where part_id=part for update;
  select sic.unit_cost into cost from public.sale_item_costs sic where sic.item_id=sale_item.id;
  update public.part_costs set average_cost=round((stock::numeric*average_cost+q*cost)/(stock::numeric+q),4) where part_id=part;
  insert into public.sale_returns(item_id,quantity,refund,reason,created_by) values(sale_item.id,q,amount,reason,actor) returning id into doc;
  update public.stock_balances set quantity=quantity+q where part_id=part;
  insert into public.stock_movements(part_id,quantity,reason,sale_id,return_id,created_by) values(part,q,'Khách trả: '||reason,sale_item.sale_id,doc,actor);
  if amount>0 then insert into public.cash_entries(direction,amount,method,reason,sale_id,created_by) values('out',amount,method,'Hoàn tiền hàng trả',sale_item.sale_id,actor); end if;
 elsif p_action='repair' then
  select jsonb_build_object('name',c.name,'phone',c.phone,'plate',v.plate,'model',v.model) into line from public.vehicles v join public.customers c on c.id=v.customer_id where v.id=(p_payload->>'vehicleId')::uuid;
  if line is null then raise exception 'NOT_FOUND'; end if;
  if nullif(p_payload->>'technicianId','') is not null and not exists(select 1 from public.profiles where id=(p_payload->>'technicianId')::uuid and active and role in ('manager','technician')) then raise exception 'INVALID_TECHNICIAN'; end if;
  insert into public.repair_orders(vehicle_id,issue,technician_id,created_by,km,customer_snapshot,store_snapshot) values((p_payload->>'vehicleId')::uuid,public.garage_text(p_payload->'issue',1,2000),nullif(p_payload->>'technicianId','')::uuid,actor,public.garage_integer(p_payload->'km',0,10000000),line,snapshot) returning id into doc;
 elsif p_action in ('assign','quote','approve','issue','payment','transition') then
  doc:=(p_payload->>'id')::uuid;
  select * into r from public.repair_orders where id=doc for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if role_name='technician' and r.technician_id is distinct from actor then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if r.version<>public.garage_integer(p_payload->'version',1,2147483646) then raise exception 'VERSION_CONFLICT'; end if;
  select * into quote from public.repair_quotes where repair_id=doc order by version desc limit 1;
  if p_action='assign' then
   if r.status in ('delivered','cancelled') then raise exception 'INVALID_TRANSITION'; end if;
   if not exists(select 1 from public.profiles where id=(p_payload->>'technicianId')::uuid and active and role in ('manager','technician')) then raise exception 'INVALID_TECHNICIAN'; end if;
   update public.repair_orders set technician_id=(p_payload->>'technicianId')::uuid,version=version+1 where id=doc;
  elsif p_action='quote' then
   if r.status not in ('received','awaiting_approval') or exists(select 1 from public.repair_part_items where repair_id=doc) then raise exception 'INVALID_TRANSITION'; end if;
   lines:=p_payload->'lines';
   if jsonb_typeof(lines) is distinct from 'array' or jsonb_array_length(lines)>100 then raise exception 'VALIDATION_ERROR'; end if;
   if (select count(distinct x->>'partId') from jsonb_array_elements(lines) x)<>jsonb_array_length(lines) then raise exception 'DUPLICATE_LINES'; end if;
   paid:=public.garage_integer(p_payload->'labor',0,1000000000); total:=paid; line:='[]'::jsonb;
   for snapshot in select value from jsonb_array_elements(lines) order by (value->>'partId')::uuid loop
    part:=(snapshot->>'partId')::uuid; q:=public.garage_integer(snapshot->'quantity',1,1000000);
    select name,sale_price into s,price from public.parts where id=part and active;
    if not found then raise exception 'NOT_FOUND'; end if;
    line:=line||jsonb_build_array(jsonb_build_object('partId',part,'name',s,'quantity',q,'price',price)); total:=total+q::bigint*price;
    if total>1000000000000 then raise exception 'VALIDATION_ERROR'; end if;
   end loop;
   insert into public.repair_quotes(repair_id,version,items,labor,total,created_by) values(doc,coalesce(quote.version,0)+1,line,paid,total,actor);
   update public.repair_orders set status='awaiting_approval',version=version+1 where id=doc;
  elsif p_action='approve' then
   if r.status<>'awaiting_approval' or quote.id is null then raise exception 'INVALID_TRANSITION'; end if;
   s:=public.garage_text(p_payload->'confirmation',1,500);
   update public.repair_quotes set customer_confirmation=s,approved_at=now() where id=quote.id;
   update public.repair_orders set status='in_progress',labor_amount=quote.labor,version=version+1 where id=doc;
  elsif p_action='issue' then
   if r.status<>'in_progress' or quote.approved_at is null or exists(select 1 from public.repair_part_items where repair_id=doc) then raise exception 'INVALID_TRANSITION'; end if;
   for line in select value from jsonb_array_elements(quote.items) order by (value->>'partId')::uuid loop
    part:=(line->>'partId')::uuid; q:=(line->>'quantity')::integer;
    select quantity into stock from public.stock_balances where part_id=part for update;
    if not found or stock<q then raise exception 'INSUFFICIENT_STOCK'; end if;
    select average_cost into cost from public.part_costs where part_id=part for update;
    insert into public.repair_part_items(repair_id,part_id,name_snapshot,quantity,unit_price) values(doc,part,line->>'name',q,(line->>'price')::bigint) returning id into item_id;
    insert into public.repair_item_costs(item_id,unit_cost) values(item_id,cost);
    update public.stock_balances set quantity=quantity-q where part_id=part;
    insert into public.stock_movements(part_id,quantity,reason,repair_id,created_by) values(part,-q,'Xuất sửa chữa',doc,actor);
   end loop;
   update public.repair_orders set version=version+1 where id=doc;
  elsif p_action='payment' then
   if r.status not in ('in_progress','ready') or quote.approved_at is null then raise exception 'INVALID_TRANSITION'; end if;
   select coalesce(sum(p.amount),0) into paid from public.payments p where repair_id=doc;
   amount:=public.garage_integer(p_payload->'amount',1,quote.total-paid);
   method:=public.garage_text(p_payload->'method',1,20); if method not in ('cash','transfer') then raise exception 'VALIDATION_ERROR'; end if;
   insert into public.payments(idempotency_key,repair_id,amount,method,created_by) values(p_request_id,doc,amount,method,actor);
   insert into public.cash_entries(direction,amount,method,reason,repair_id,created_by) values('in',amount,method,'Thu sửa chữa',doc,actor);
   update public.repair_orders set version=version+1 where id=doc;
  else
   s:=public.garage_text(p_payload->'status',1,30);
   if s='ready' and r.status='in_progress' then
    if exists(select 1 from jsonb_array_elements(quote.items) x where (x->>'quantity')::integer<>coalesce((select sum(i.quantity) from public.repair_part_items i where repair_id=doc and part_id=(x->>'partId')::uuid),0)) then raise exception 'PARTS_NOT_ISSUED'; end if;
    reason:=public.garage_text(p_payload->'quality',1,500);
    update public.repair_orders set status='ready',quality_note=reason,version=version+1 where id=doc;
   elsif s='delivered' and r.status='ready' and role_name in ('manager','sales') then
    select coalesce(sum(p.amount),0) into paid from public.payments p where repair_id=doc;
    if paid<>quote.total then raise exception 'PAYMENT_REQUIRED'; end if;
    update public.repair_orders set status='delivered',delivered_at=now(),version=version+1 where id=doc;
   elsif s='cancelled' and r.status in ('received','awaiting_approval') and role_name='manager' then
    reason:=public.garage_text(p_payload->'reason',1,500);
    if exists(select 1 from public.repair_part_items where repair_id=doc) or exists(select 1 from public.payments where repair_id=doc) then raise exception 'HAS_TRANSACTIONS'; end if;
    update public.repair_orders set status='cancelled',quality_note=reason,version=version+1 where id=doc;
   else raise exception 'INVALID_TRANSITION'; end if;
  end if;
 else raise exception 'UNKNOWN_COMMAND'; end if;
 result:=jsonb_build_object('id',doc,'action',p_action,'total',total);
 insert into public.garage_requests(actor_id,request_id,action,payload,result) values(actor,p_request_id,p_action,p_payload,result);
 insert into public.audit_logs(actor_id,action,entity_id,details) values(actor,'garage.'||p_action,doc,jsonb_build_object('request_id',p_request_id));
 return result;
end $$;

revoke all on function public.garage_actor(),public.garage_integer(jsonb,bigint,bigint),public.garage_text(jsonb,integer,integer),public.garage_command(text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.garage_command(text,jsonb,uuid) to authenticated;
commit;
