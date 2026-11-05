begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('part-images','part-images',false,2097152,array['image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create table public.part_images(
 part_id uuid primary key references public.parts(id) on delete cascade,
 path text unique, version integer not null default 1 check(version>0),
 updated_by uuid not null references public.profiles(id),updated_at timestamptz not null default now()
);
alter table public.part_images enable row level security;
revoke all on public.part_images from anon,authenticated;
grant select on public.part_images to authenticated;
create policy staff_read_part_images on public.part_images for select to authenticated
using(public.is_staff() and exists(select 1 from public.parts p where p.id=part_id and p.active));
-- No client upload/update/delete policies: only the validated server upload endpoint writes blobs.
create policy staff_read_bound_part_images on storage.objects for select to authenticated
using(bucket_id='part-images' and public.is_staff() and exists(select 1 from public.part_images i where i.path=name));
create function public.set_part_image(p_part uuid,p_path text,p_version integer,p_request uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a jsonb:=public.garage_actor(); actor uuid:=(a->>'id')::uuid; current_image public.part_images;
 old_request public.garage_requests; body jsonb; result jsonb; previous_path text;
begin
 if a->>'role'<>'manager' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if p_part is null or p_request is null or p_version is null or p_version<0 then raise exception 'IMAGE_INVALID'; end if;
 body:=jsonb_build_object('partId',p_part,'path',p_path,'version',p_version);
 perform pg_advisory_xact_lock(hashtextextended(actor::text||p_request::text,0));
 select * into old_request from public.garage_requests where actor_id=actor and request_id=p_request;
 if found then
  if old_request.action<>'part_image' or old_request.payload<>body then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  return old_request.result;
 end if;
 perform 1 from public.parts where id=p_part and active for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 select * into current_image from public.part_images where part_id=p_part for update;
 if coalesce(current_image.version,0)<>p_version then raise exception 'VERSION_CONFLICT'; end if;
 if p_path is not null then
  if p_path !~ ('^'||p_part::text||'/'||p_request::text||'/[a-f0-9]{64}\.webp$') then raise exception 'IMAGE_INVALID'; end if;
  if not exists(select 1 from storage.objects o where o.bucket_id='part-images' and o.name=p_path
    and o.metadata->>'mimetype'='image/webp' and (o.metadata->>'size')::bigint between 1 and 2097152) then raise exception 'IMAGE_NOT_UPLOADED'; end if;
 end if;
 previous_path:=current_image.path;
 insert into public.part_images(part_id,path,version,updated_by) values(p_part,p_path,p_version+1,actor)
 on conflict(part_id) do update set path=excluded.path,version=excluded.version,updated_by=actor,updated_at=now();
 result:=jsonb_build_object('part_id',p_part,'path',p_path,'version',p_version+1,'previous_path',previous_path);
 insert into public.garage_requests(actor_id,request_id,action,payload,result) values(actor,p_request,'part_image',body,result);
 insert into public.audit_logs(actor_id,action,entity_id,details) values(actor,'part.image',p_part,jsonb_build_object('request_id',p_request,'removed',p_path is null,'version',p_version+1));
 return result;
end $$;
revoke all on function public.set_part_image(uuid,text,integer,uuid) from public,anon,authenticated;
grant execute on function public.set_part_image(uuid,text,integer,uuid) to authenticated;
commit;
