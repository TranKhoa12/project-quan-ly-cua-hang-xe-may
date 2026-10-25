begin;

alter table public.profiles add column login_name text unique;
alter table public.profiles add constraint profiles_login_name_valid check (login_name is null or login_name ~ '^[a-z][a-z0-9._-]{2,31}$');

create function public.has_shop_role(p_roles public.staff_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and active and role = any(p_roles));
$$;
revoke all on function public.has_shop_role(public.staff_role[]) from public, anon;
grant execute on function public.has_shop_role(public.staff_role[]) to authenticated;

create policy sales_customers_read on public.customers for select to authenticated using (public.has_shop_role(array['sales']::public.staff_role[]));
create policy sales_vehicles_read on public.vehicles for select to authenticated using (public.has_shop_role(array['sales']::public.staff_role[]));
create policy sales_repairs_read on public.repair_orders for select to authenticated using (public.has_shop_role(array['sales']::public.staff_role[]));
create policy sales_repair_items_read on public.repair_part_items for select to authenticated using (public.has_shop_role(array['sales']::public.staff_role[]));
create policy sales_orders_read on public.sales_orders for select to authenticated using (public.has_shop_role(array['sales']::public.staff_role[]));
create policy sales_items_read on public.sales_order_items for select to authenticated using (public.has_shop_role(array['sales']::public.staff_role[]));
create policy technician_repair_items_read on public.repair_part_items for select to authenticated using (
  public.has_shop_role(array['technician']::public.staff_role[]) and exists (
    select 1 from public.repair_orders r where r.id = repair_id and r.technician_id = auth.uid()
  )
);

-- No profiles table write grants. All permission changes use checked functions.
create function public.register_staff_profile(p_id uuid, p_login_name text, p_full_name text, p_role public.staff_role)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_manager() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_login_name !~ '^[a-z][a-z0-9._-]{2,31}$' or length(trim(p_full_name)) not between 1 and 100 then
    raise exception 'VALIDATION_ERROR' using errcode = '22023';
  end if;
  if not exists(select 1 from auth.users where id = p_id and email = p_login_name || '@accounts.motocare.invalid') then
    raise exception 'INVALID_AUTH_IDENTITY' using errcode = '22023';
  end if;
  insert into public.profiles(id, login_name, full_name, role, active) values(p_id, p_login_name, trim(p_full_name), p_role, true);
  insert into public.audit_logs(actor_id, action, entity_id, details)
  values(auth.uid(), 'staff.created', p_id, jsonb_build_object('role', p_role, 'login_name', p_login_name));
end;
$$;

create function public.update_staff_access(p_id uuid, p_role public.staff_role, p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare target public.profiles;
begin
  -- Serialize manager status changes so two managers cannot remove each other concurrently.
  lock table public.profiles in share row exclusive mode;
  if not public.is_manager() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  select * into target from public.profiles where id = p_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if p_role is null or p_active is null then raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
  if p_id = auth.uid() and (p_role <> target.role or not p_active) then raise exception 'CANNOT_CHANGE_OWN_ACCESS' using errcode = '42501'; end if;
  if target.role = 'manager' and target.active and (p_role <> 'manager' or not p_active) then
    if (select count(*) from public.profiles where role = 'manager' and active) <= 1 then
      raise exception 'LAST_MANAGER' using errcode = '42501';
    end if;
  end if;
  update public.profiles set role = p_role, active = p_active where id = p_id;
  insert into public.audit_logs(actor_id, action, entity_id, details)
  values(auth.uid(), 'staff.access_updated', p_id, jsonb_build_object('old_role',target.role,'role',p_role,'active',p_active));
end;
$$;
revoke all on function public.register_staff_profile(uuid,text,text,public.staff_role) from public, anon;
revoke all on function public.update_staff_access(uuid,public.staff_role,boolean) from public, anon;
grant execute on function public.register_staff_profile(uuid,text,text,public.staff_role) to authenticated;
grant execute on function public.update_staff_access(uuid,public.staff_role,boolean) to authenticated;

-- Persisted limiter: secret HMAC buckets computed only by the application server.
create table public.auth_attempt_limits (
  bucket text primary key check(bucket ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null default now(),
  attempts integer not null default 1 check(attempts > 0)
);
alter table public.auth_attempt_limits enable row level security;
revoke all on public.auth_attempt_limits from anon, authenticated;
create function public.consume_auth_attempt(p_bucket text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare hits integer;
begin
  if p_bucket !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_BUCKET'; end if;
  insert into public.auth_attempt_limits(bucket) values(p_bucket)
  on conflict(bucket) do update set
    attempts = case when public.auth_attempt_limits.window_started_at < now() - interval '15 minutes' then 1 else public.auth_attempt_limits.attempts + 1 end,
    window_started_at = case when public.auth_attempt_limits.window_started_at < now() - interval '15 minutes' then now() else public.auth_attempt_limits.window_started_at end
  returning attempts into hits;
  delete from public.auth_attempt_limits where window_started_at < now() - interval '1 day';
  return hits <= 12;
end;
$$;
revoke all on function public.consume_auth_attempt(text) from public, anon, authenticated;
grant execute on function public.consume_auth_attempt(text) to service_role;

commit;
