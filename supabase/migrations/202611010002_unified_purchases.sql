begin;
alter table public.parts add column pos_visible boolean not null default true;

alter function public.garage_snapshot(text,integer,date,date) rename to garage_snapshot_base;
revoke all on function public.garage_snapshot_base(text,integer,date,date) from public,anon,authenticated;
create function public.garage_snapshot(p_section text,p_page integer default 0,p_from date default null,p_to date default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb; rows jsonb;
begin
 result:=public.garage_snapshot_base(p_section,p_page,p_from,p_to);
 select coalesce(jsonb_agg(e.value||jsonb_build_object('pos_visible',p.pos_visible) order by e.ord),'[]') into rows
 from jsonb_array_elements(result->'parts') with ordinality e(value,ord) join public.parts p on p.id=(e.value->>'id')::uuid;
 return result||jsonb_build_object('parts',rows);
end $$;
revoke all on function public.garage_snapshot(text,integer,date,date) from public,anon,authenticated;
grant execute on function public.garage_snapshot(text,integer,date,date) to authenticated;

alter function public.garage_command(text,jsonb,uuid) rename to garage_command_pos;
revoke all on function public.garage_command_pos(text,jsonb,uuid) from public,anon,authenticated;
create function public.garage_command(p_action text,p_payload jsonb,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a jsonb:=public.garage_actor(); actor uuid:=(a->>'id')::uuid; old public.garage_requests;
 result jsonb; line jsonb; item jsonb; new_part jsonb; mapped jsonb:='[]'; part uuid; visible boolean; idx integer:=0;
begin
 if p_request_id is null or p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>100000 then raise exception 'VALIDATION_ERROR'; end if;
 if p_action in ('purchase_intake','part_visibility') then
  if a->>'role'<>'manager' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_action='purchase_intake' then perform pg_advisory_xact_lock(hashtextextended('purchase_intake:catalog',0)); end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text||p_request_id::text,0));
  select * into old from public.garage_requests where actor_id=actor and request_id=p_request_id;
  if found then
   if old.action<>p_action or old.payload<>p_payload then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
   return old.result;
  end if;
  if p_action='part_visibility' then
   if jsonb_typeof(p_payload->'visible') is distinct from 'boolean' or jsonb_typeof(p_payload->'expected') is distinct from 'boolean' then raise exception 'VALIDATION_ERROR'; end if;
   part:=(p_payload->>'partId')::uuid;
   perform 1 from public.stock_balances where part_id=part for update;
   select pos_visible into visible from public.parts where id=part and active for update;
   if not found then raise exception 'NOT_FOUND'; end if;
   if visible is distinct from (p_payload->>'expected')::boolean then raise exception 'VERSION_CONFLICT'; end if;
   update public.parts set pos_visible=(p_payload->>'visible')::boolean where id=part;
   result:=jsonb_build_object('id',part,'action',p_action,'total',0);
  else
   if jsonb_typeof(p_payload->'lines') is distinct from 'array' or jsonb_array_length(p_payload->'lines') not between 1 and 100 then raise exception 'VALIDATION_ERROR'; end if;
   for line in select value from jsonb_array_elements(p_payload->'lines') loop
    idx:=idx+1;
    perform public.garage_integer(line->'quantity',1,1000000); perform public.garage_integer(line->'cost',0,1000000000);
    if line?'newPart' then
     if line?'partId' or jsonb_typeof(line->'newPart') is distinct from 'object' then raise exception 'VALIDATION_ERROR'; end if;
     new_part:=line->'newPart';
     if jsonb_typeof(new_part->'allowSimilar') is distinct from 'boolean' then raise exception 'VALIDATION_ERROR'; end if;
     item:=public.create_part_with_terms(public.garage_text(new_part->'name',1,180),public.garage_text(new_part->'category',1,100),public.garage_text(new_part->'brand',1,100),
      public.garage_integer(new_part->'price',0,1000000000),0,public.garage_integer(new_part->'min',0,1000000)::integer,
      md5(p_request_id::text||':part:'||idx::text)::uuid,(new_part->>'allowSimilar')::boolean);
     if item->>'status'='duplicate' then raise exception 'PART_DUPLICATE'; end if;
     if item->>'status'='similar' then raise exception 'PART_SIMILAR'; end if;
     if item->'part'->>'id' is null then raise exception 'VALIDATION_ERROR'; end if;
     part:=(item->'part'->>'id')::uuid;
    else
     part:=(line->>'partId')::uuid;
     if part is null then raise exception 'VALIDATION_ERROR'; end if;
    end if;
    mapped:=mapped||jsonb_build_array(jsonb_build_object('partId',part,'quantity',line->'quantity','cost',line->'cost'));
   end loop;
   result:=public.garage_command_pos('purchase',(p_payload-'lines')||jsonb_build_object('lines',mapped),md5(p_request_id::text||':purchase')::uuid);
   result:=result||jsonb_build_object('action',p_action);
  end if;
  insert into public.garage_requests(actor_id,request_id,action,payload,result) values(actor,p_request_id,p_action,p_payload,result);
  insert into public.audit_logs(actor_id,action,entity_id,details) values(actor,'garage.'||p_action,(result->>'id')::uuid,jsonb_build_object('request_id',p_request_id));
  return result;
 end if;
 if p_action='sale' then
  if a->>'role' not in ('manager','sales') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('pos:'||actor::text,0));
  -- Completed requests must still be retrievable after a part is hidden.
  if not exists(select 1 from public.garage_requests where actor_id=actor and request_id=p_request_id) then
   if jsonb_typeof(p_payload->'lines') is distinct from 'array' or jsonb_array_length(p_payload->'lines') not between 1 and 100 then raise exception 'VALIDATION_ERROR'; end if;
   for line in select value from jsonb_array_elements(p_payload->'lines') order by (value->>'partId')::uuid loop
    part:=(line->>'partId')::uuid;
    perform 1 from public.stock_balances where part_id=part for update;
    select pos_visible into visible from public.parts where id=part and active for share;
    if not found then raise exception 'NOT_FOUND'; end if;
    if not visible then raise exception 'PART_HIDDEN'; end if;
   end loop;
  end if;
 end if;
 return public.garage_command_pos(p_action,p_payload,p_request_id);
end $$;
revoke all on function public.garage_command(text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.garage_command(text,jsonb,uuid) to authenticated;
commit;
