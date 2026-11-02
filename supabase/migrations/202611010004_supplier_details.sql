begin;
alter table public.suppliers add column details_version integer not null default 1;

create or replace function public.garage_snapshot(p_section text,p_page integer default 0,p_from date default null,p_to date default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb; rows jsonb;
begin
 result:=public.garage_snapshot_base(p_section,p_page,p_from,p_to);
 select coalesce(jsonb_agg(e.value||jsonb_build_object('pos_visible',p.pos_visible) order by e.ord),'[]') into rows
 from jsonb_array_elements(result->'parts') with ordinality e(value,ord) join public.parts p on p.id=(e.value->>'id')::uuid;
 result:=result||jsonb_build_object('parts',rows);
 if result?'suppliers' then
  select coalesce(jsonb_agg(e.value||jsonb_build_object('details_version',s.details_version) order by e.ord),'[]') into rows
  from jsonb_array_elements(result->'suppliers') with ordinality e(value,ord) join public.suppliers s on s.id=(e.value->>'id')::uuid;
  result:=result||jsonb_build_object('suppliers',rows);
 end if;
 return result;
end $$;
revoke all on function public.garage_snapshot(text,integer,date,date) from public,anon,authenticated;
grant execute on function public.garage_snapshot(text,integer,date,date) to authenticated;

create function public.update_supplier_details(p_payload jsonb,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a jsonb:=public.garage_actor(); actor uuid:=(a->>'id')::uuid; previous public.garage_requests;
 item public.suppliers; before_details jsonb; result jsonb; n text; phone_value text; supplier uuid; version integer;
begin
 if a->>'role'<>'manager' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if p_request_id is null or p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>10000 then raise exception 'SUPPLIER_DETAILS_INVALID'; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text||p_request_id::text,0));
 select * into previous from public.garage_requests where actor_id=actor and request_id=p_request_id;
 if found then
  if previous.action<>'supplier_details' or previous.payload<>p_payload then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  return previous.result;
 end if;
 if jsonb_typeof(p_payload->'name') is distinct from 'string' or jsonb_typeof(p_payload->'phone') is distinct from 'string' then raise exception 'SUPPLIER_DETAILS_INVALID'; end if;
 n:=trim(regexp_replace(p_payload->>'name','\s+',' ','g'));phone_value:=trim(p_payload->>'phone');
 if length(n) not between 1 and 180 or length(phone_value)>30 then raise exception 'SUPPLIER_DETAILS_INVALID'; end if;
 supplier:=(p_payload->>'supplierId')::uuid;version:=public.garage_integer(p_payload->'version',1,2147483646)::integer;
 select * into item from public.suppliers where id=supplier for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if item.details_version<>version then raise exception 'VERSION_CONFLICT'; end if;
 before_details:=jsonb_build_object('name',item.name,'phone',item.phone,'details_version',item.details_version);
 update public.suppliers set name=n,phone=phone_value,details_version=details_version+1 where id=supplier returning * into item;
 result:=jsonb_build_object('id',supplier,'action','supplier_details','total',0,'supplierDetails',jsonb_build_object('id',item.id,'name',item.name,'phone',item.phone,'details_version',item.details_version));
 insert into public.garage_requests(actor_id,request_id,action,payload,result) values(actor,p_request_id,'supplier_details',p_payload,result);
 insert into public.audit_logs(actor_id,action,entity_id,details) values(actor,'garage.supplier_details',supplier,jsonb_build_object('request_id',p_request_id,'before',before_details,'after',result->'supplierDetails'));
 return result;
end $$;
revoke all on function public.update_supplier_details(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.update_supplier_details(jsonb,uuid) to authenticated;
commit;
