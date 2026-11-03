begin;
-- Keep creation request IDs as historical references after an unused item is deleted.
alter table public.part_creation_requests drop constraint part_creation_requests_part_id_fkey;

-- Quotes store part IDs in JSON. Lock referenced parts until the quote commits,
-- so a concurrent deletion cannot leave a newly created quote pointing at missing goods.
create function public.lock_quote_parts() returns trigger
language plpgsql security definer set search_path='' as $$
declare part uuid;
begin
 for part in select distinct (x->>'partId')::uuid from jsonb_array_elements(new.items) x order by 1 loop
  perform 1 from public.parts where id=part for key share;
  if not found then raise exception 'NOT_FOUND'; end if;
 end loop;
 return new;
end $$;
revoke all on function public.lock_quote_parts() from public,anon,authenticated;
create trigger quote_parts_exist before insert or update of items on public.repair_quotes for each row execute function public.lock_quote_parts();

create function public.delete_part(p_payload jsonb,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a jsonb:=public.garage_actor(); actor uuid:=(a->>'id')::uuid; previous public.garage_requests;
 item public.parts; result jsonb; part uuid; version integer; stock integer;
begin
 if a->>'role'<>'manager' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if p_request_id is null or p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>10000 then raise exception 'VALIDATION_ERROR'; end if;
 perform pg_advisory_xact_lock(hashtextextended('purchase_intake:catalog',0));
 perform pg_advisory_xact_lock(hashtextextended('parts:metadata',0));
 perform pg_advisory_xact_lock(hashtextextended(actor::text||p_request_id::text,0));
 select * into previous from public.garage_requests where actor_id=actor and request_id=p_request_id;
 if found then
  if previous.action<>'part_delete' or previous.payload<>p_payload then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  return previous.result;
 end if;
 part:=(p_payload->>'partId')::uuid;
 version:=public.garage_integer(p_payload->'version',1,2147483646)::integer;
 if part is null then raise exception 'VALIDATION_ERROR'; end if;
 -- Match inventory writers: stock first, then part metadata.
 select quantity into stock from public.stock_balances where part_id=part for update;
 select * into item from public.parts where id=part for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if item.details_version<>version then raise exception 'VERSION_CONFLICT'; end if;
 if coalesce(stock,0)<>0 then raise exception 'PART_HAS_STOCK'; end if;
 if exists(select 1 from public.purchase_items where part_id=part)
  or exists(select 1 from public.sales_order_items where part_id=part)
  or exists(select 1 from public.repair_part_items where part_id=part)
  or exists(select 1 from public.stock_movements where part_id=part)
  or exists(select 1 from public.repair_quotes where items @> jsonb_build_array(jsonb_build_object('partId',part))) then
  raise exception 'PART_IN_USE';
 end if;
 begin
  delete from public.part_costs where part_id=part;
  delete from public.stock_balances where part_id=part;
  delete from public.parts where id=part;
 exception when foreign_key_violation then raise exception 'PART_IN_USE';
 end;
 result:=jsonb_build_object('id',part,'action','part_delete','total',0);
 insert into public.garage_requests(actor_id,request_id,action,payload,result) values(actor,p_request_id,'part_delete',p_payload,result);
 insert into public.audit_logs(actor_id,action,entity_id,details) values(actor,'garage.part_delete',part,jsonb_build_object('request_id',p_request_id,'before',to_jsonb(item)));
 return result;
end $$;
revoke all on function public.delete_part(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.delete_part(jsonb,uuid) to authenticated;
commit;
