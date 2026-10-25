begin;
-- One database round trip checks both live role and session revocation.
create function public.current_staff_actor() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id',p.id,'full_name',p.full_name,'login_name',p.login_name,'role',p.role,'active',p.active)
  from public.profiles p
  where p.id=auth.uid() and p.active and p.login_name is not null
    and exists(select 1 from auth.sessions s where s.user_id=p.id
      and s.id::text=auth.jwt()->>'session_id'
      and (s.not_after is null or s.not_after>now()));
$$;
revoke all on function public.current_staff_actor() from public,anon;
grant execute on function public.current_staff_actor() to authenticated;
commit;
