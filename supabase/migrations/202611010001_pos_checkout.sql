begin;
alter table public.store_settings
 add column bank_code text not null default '',
 add column bank_name text not null default '',
 add column bank_account text not null default '',
 add column bank_holder text not null default '';

create table public.pos_drafts(
 actor_id uuid primary key references public.profiles(id),
 revision integer not null default 1,
 status text not null default 'editing' check(status in ('editing','pending','completed')),
 body jsonb not null default '{}',
 request_id uuid,
 updated_at timestamptz not null default now()
);
alter table public.pos_drafts enable row level security;
revoke all on public.pos_drafts from anon,authenticated;

create function public.pos_receipt(p_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',s.id,'code',s.code,'customer_name',s.customer_name,'total',s.total,
 'payment_method',s.payment_method,'created_at',s.created_at,'store_snapshot',s.store_snapshot,
 'items',(select jsonb_agg(jsonb_build_object('id',i.id,'name',i.name_snapshot,'quantity',i.quantity,'price',i.unit_price,'returned',0)) from public.sales_order_items i where i.sale_id=s.id))
 from public.sales_orders s where s.id=p_id
$$;
revoke all on function public.pos_receipt(uuid) from public,anon,authenticated;

-- Serialize each cashier's draft and payment, including requests from another tab.
create function public.garage_pos_draft(p_operation text,p_revision integer default 0,p_body jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare a jsonb:=public.garage_actor(); actor uuid:=(a->>'id')::uuid; d public.pos_drafts; old public.garage_requests;
begin
 if a->>'role' not in ('manager','sales') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('pos:'||actor::text,0));
 select * into d from public.pos_drafts where actor_id=actor;
 if p_operation='load' then return to_jsonb(d); end if;
 if p_revision is distinct from coalesce(d.revision,0) then raise exception 'VERSION_CONFLICT'; end if;
 if p_operation in ('save','prepare') then
  if d.status in ('pending','completed') then raise exception 'PAYMENT_PENDING'; end if;
  if p_body is null or jsonb_typeof(p_body)<>'object' or octet_length(p_body::text)>100000 then raise exception 'VALIDATION_ERROR'; end if;
  if p_operation='prepare' and (p_body->>'requestId' is null or jsonb_typeof(p_body->'command') is distinct from 'object') then raise exception 'VALIDATION_ERROR'; end if;
  if p_operation='prepare' and exists(select 1 from public.garage_requests where actor_id=actor and request_id=(p_body->>'requestId')::uuid) then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  insert into public.pos_drafts(actor_id,revision,status,body,request_id)
   values(actor,coalesce(d.revision,0)+1,case when p_operation='prepare' then 'pending' else 'editing' end,p_body,case when p_operation='prepare' then (p_body->>'requestId')::uuid end)
   on conflict(actor_id) do update set revision=excluded.revision,status=excluded.status,body=excluded.body,request_id=excluded.request_id,updated_at=now();
 elsif p_operation='resume' then
  select * into old from public.garage_requests where actor_id=actor and request_id=d.request_id;
  if found then
   if old.action<>'sale' or old.payload is distinct from d.body->'command' then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
   update public.pos_drafts set status='completed',revision=revision+1,body=body||jsonb_build_object('receipt',public.pos_receipt((old.result->>'id')::uuid)) where actor_id=actor;
  else
   update public.pos_drafts set status='editing',revision=revision+1,request_id=null,body=coalesce(body->'draft',body) where actor_id=actor;
  end if;
 elsif p_operation='clear' then
  if d.status='pending' then raise exception 'PAYMENT_PENDING'; end if;
  -- Keep a monotonically increasing revision to reject stale tabs after clearing.
  update public.pos_drafts set revision=revision+1,status='editing',body='{}',request_id=null,updated_at=now() where actor_id=actor;
 else raise exception 'VALIDATION_ERROR'; end if;
 select * into d from public.pos_drafts where actor_id=actor;
 return to_jsonb(d);
end $$;
revoke all on function public.garage_pos_draft(text,integer,jsonb) from public,anon,authenticated;
grant execute on function public.garage_pos_draft(text,integer,jsonb) to authenticated;

alter function public.garage_command(text,jsonb,uuid) rename to garage_command_core;
revoke all on function public.garage_command_core(text,jsonb,uuid) from public,anon,authenticated;
create function public.garage_command(p_action text,p_payload jsonb,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a jsonb:=public.garage_actor(); actor uuid:=(a->>'id')::uuid; result jsonb; old public.garage_requests;
 d public.pos_drafts; expected bigint; code text; account text; holder text; bank text;
begin
 if p_request_id is null or p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>100000 then raise exception 'VALIDATION_ERROR'; end if;
 if p_action='bank_settings' then
  if a->>'role'<>'manager' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text||p_request_id::text,0));
  select * into old from public.garage_requests where actor_id=actor and request_id=p_request_id;
  if found then
   if old.action<>p_action or old.payload<>p_payload then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
   return old.result;
  end if;
  code:=public.garage_text(p_payload->'bank_code',0,20); bank:=public.garage_text(p_payload->'bank_name',0,100);
  account:=public.garage_text(p_payload->'bank_account',0,30); holder:=public.garage_text(p_payload->'bank_holder',0,100);
  if (code<>'' or bank<>'' or account<>'' or holder<>'') and (code!~'^[A-Za-z0-9]{2,20}$' or account!~'^[0-9]{4,30}$' or bank='' or holder='') then raise exception 'VALIDATION_ERROR'; end if;
  update public.store_settings set bank_code=code,bank_name=bank,bank_account=account,bank_holder=holder,version=version+1
   where id and version=public.garage_integer(p_payload->'version',1,2147483646);
  if not found then raise exception 'VERSION_CONFLICT'; end if;
  result:=jsonb_build_object('id',null,'action',p_action,'total',0);
  insert into public.garage_requests(actor_id,request_id,action,payload,result) values(actor,p_request_id,p_action,p_payload,result);
  insert into public.audit_logs(actor_id,action,details) values(actor,'garage.bank_settings',jsonb_build_object('request_id',p_request_id));
  return result;
 end if;
 if p_action='sale' then
  if a->>'role' not in ('manager','sales') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('pos:'||actor::text,0));
  select * into d from public.pos_drafts where actor_id=actor;
  if p_payload->'pos'='true'::jsonb and (d.status is null or d.status not in ('pending','completed') or d.request_id is distinct from p_request_id or d.body->'command' is distinct from p_payload) then raise exception 'PAYMENT_PENDING'; end if;
  if d.status='pending' and (d.request_id<>p_request_id or d.body->'command'<>p_payload) then raise exception 'PAYMENT_PENDING'; end if;
  if p_payload->'receivedConfirmed' is distinct from 'true'::jsonb then raise exception 'PAYMENT_CONFIRMATION_REQUIRED'; end if;
  if jsonb_typeof(p_payload->'lines') is distinct from 'array' then raise exception 'VALIDATION_ERROR'; end if;
  select sum(public.garage_integer(l->'quantity',1,1000000)*public.garage_integer(l->'price',0,1000000000)) into expected from jsonb_array_elements(p_payload->'lines') l;
  if p_payload->>'method'='cash' and public.garage_integer(p_payload->'cashReceived',0,1000000000000)<expected then raise exception 'PAYMENT_REQUIRED'; end if;
 end if;
 result:=public.garage_command_core(p_action,p_payload,p_request_id);
 if p_action='sale' then
  result:=result||jsonb_build_object('receipt',public.pos_receipt((result->>'id')::uuid));
  if d.status='pending' then
   update public.pos_drafts set status='completed',revision=revision+1,body=body||jsonb_build_object('receipt',result->'receipt'),updated_at=now() where actor_id=actor;
  end if;
 end if;
 return result;
end $$;
revoke all on function public.garage_command(text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.garage_command(text,jsonb,uuid) to authenticated;
commit;
