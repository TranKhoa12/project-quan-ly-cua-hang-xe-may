begin;
create function public.delete_supplier(p_payload jsonb,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a jsonb:=public.garage_actor(); actor uuid:=(a->>'id')::uuid; previous public.garage_requests;
 item public.suppliers; result jsonb; supplier uuid; version integer;
begin
 if a->>'role'<>'manager' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if p_request_id is null or p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>10000 then raise exception 'VALIDATION_ERROR'; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text||p_request_id::text,0));
 select * into previous from public.garage_requests where actor_id=actor and request_id=p_request_id;
 if found then
  if previous.action<>'supplier_delete' or previous.payload<>p_payload then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  return previous.result;
 end if;
 supplier:=(p_payload->>'supplierId')::uuid;
 version:=public.garage_integer(p_payload->'version',1,2147483646)::integer;
 if supplier is null then raise exception 'VALIDATION_ERROR'; end if;
 select * into item from public.suppliers where id=supplier for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if item.details_version<>version then raise exception 'VERSION_CONFLICT'; end if;
 if exists(select 1 from public.purchase_receipts where supplier_id=supplier) then raise exception 'SUPPLIER_IN_USE'; end if;
 begin
  delete from public.suppliers where id=supplier;
 exception when foreign_key_violation then raise exception 'SUPPLIER_IN_USE';
 end;
 result:=jsonb_build_object('id',supplier,'action','supplier_delete','total',0);
 insert into public.garage_requests(actor_id,request_id,action,payload,result) values(actor,p_request_id,'supplier_delete',p_payload,result);
 insert into public.audit_logs(actor_id,action,entity_id,details) values(actor,'garage.supplier_delete',supplier,jsonb_build_object('request_id',p_request_id,'before',to_jsonb(item)));
 return result;
end $$;
revoke all on function public.delete_supplier(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.delete_supplier(jsonb,uuid) to authenticated;
commit;
