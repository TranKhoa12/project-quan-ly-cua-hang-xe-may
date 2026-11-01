begin;
alter table public.parts add column details_version integer not null default 1;

create function public.update_part_details(p_payload jsonb,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a jsonb:=public.garage_actor(); actor uuid:=(a->>'id')::uuid; previous public.garage_requests;
 item public.parts; before_details jsonb; result jsonb; n text; c text; b text; part uuid; version integer;
begin
 if a->>'role'<>'manager' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if p_request_id is null or p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>10000 then raise exception 'PART_DETAILS_INVALID'; end if;
 -- Use the intake catalog lock before touching parts and shared suggestion terms.
 perform pg_advisory_xact_lock(hashtextextended('purchase_intake:catalog',0));
 perform pg_advisory_xact_lock(hashtextextended('parts:metadata',0));
 perform pg_advisory_xact_lock(hashtextextended(actor::text||p_request_id::text,0));
 select * into previous from public.garage_requests where actor_id=actor and request_id=p_request_id;
 if found then
  if previous.action<>'part_details' or previous.payload<>p_payload then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  return previous.result;
 end if;
 if jsonb_typeof(p_payload->'name') is distinct from 'string' or jsonb_typeof(p_payload->'category') is distinct from 'string' or jsonb_typeof(p_payload->'brand') is distinct from 'string' then raise exception 'PART_DETAILS_INVALID'; end if;
 n:=trim(regexp_replace(p_payload->>'name','\s+',' ','g'));
 c:=trim(regexp_replace(p_payload->>'category','\s+',' ','g'));
 b:=trim(regexp_replace(p_payload->>'brand','\s+',' ','g'));
 if length(n) not between 1 and 180 or length(c) not between 1 and 100 or length(b) not between 1 and 100
  or public.normalize_part_text(n)='' or public.normalize_part_text(c)='' or public.normalize_part_text(b)='' then raise exception 'PART_DETAILS_INVALID'; end if;
 part:=(p_payload->>'partId')::uuid;version:=public.garage_integer(p_payload->'version',1,2147483646)::integer;
 select * into item from public.parts where id=part and active for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if item.details_version<>version then raise exception 'VERSION_CONFLICT'; end if;
 if exists(select 1 from public.parts where id<>part and normalized_name=public.normalize_part_text(n) and normalized_brand=public.normalize_part_text(b)) then raise exception 'PART_DETAILS_DUPLICATE'; end if;
 before_details:=jsonb_build_object('name',item.name,'category',item.category,'brand',item.brand,'details_version',item.details_version);
 begin
  update public.parts set name=n,category=c,brand=b,details_version=details_version+1 where id=part returning * into item;
 exception when unique_violation then raise exception 'PART_DETAILS_DUPLICATE'; end;
 -- Learn new wording without deleting shared reference terms or rewriting history.
 insert into public.part_terms(kind,name,category,created_by) values('name',n,c,actor) on conflict(kind,normalized_name) do nothing;
 insert into public.part_terms(kind,name,created_by) values('category',c,actor),('brand',b,actor) on conflict(kind,normalized_name) do nothing;
 result:=jsonb_build_object('id',part,'action','part_details','total',0,'partDetails',jsonb_build_object('id',part,'name',item.name,'category',item.category,'brand',item.brand,'details_version',item.details_version));
 insert into public.garage_requests(actor_id,request_id,action,payload,result) values(actor,p_request_id,'part_details',p_payload,result);
 insert into public.audit_logs(actor_id,action,entity_id,details) values(actor,'garage.part_details',part,jsonb_build_object('request_id',p_request_id,'before',before_details,'after',result->'partDetails'));
 return result;
end $$;
revoke all on function public.update_part_details(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.update_part_details(jsonb,uuid) to authenticated;
commit;
