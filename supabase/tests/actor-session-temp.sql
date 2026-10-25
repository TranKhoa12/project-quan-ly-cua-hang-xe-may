-- Verify the deployed query body using isolated temporary tables only.
-- No fixtures or mutations in public/auth tables. Everything is rolled back.
begin;
create temporary table qa_profiles(id uuid,full_name text,login_name text,role text,active boolean);
create temporary table qa_sessions(id uuid,user_id uuid,not_after timestamptz);
create function pg_temp.qa_uid() returns uuid language sql stable as $$select nullif(current_setting('qa.user_id',true),'')::uuid$$;
create function pg_temp.qa_jwt() returns jsonb language sql stable as $$select jsonb_build_object('session_id',current_setting('qa.session_id',true))$$;
do $$
declare body text;
begin
  body:=pg_get_functiondef('public.current_staff_actor()'::regprocedure);
  body:=replace(body,'public.current_staff_actor()','pg_temp.qa_current_staff_actor()');
  body:=replace(body,'public.profiles','pg_temp.qa_profiles');
  body:=replace(body,'auth.sessions','pg_temp.qa_sessions');
  body:=replace(body,'auth.uid()','pg_temp.qa_uid()');
  body:=replace(body,'auth.jwt()','pg_temp.qa_jwt()');
  if position('FUNCTION pg_temp.qa_current_staff_actor()' in body)=0 or position('public.profiles' in body)>0 or position('auth.sessions' in body)>0 then
    raise exception 'Unsafe temporary test setup';
  end if;
  execute body;
end;
$$;
insert into qa_profiles values('00000000-0000-4000-8000-000000000001','Test manager','testmanager','manager',true);
insert into qa_sessions values('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001',null);
do $$
declare actor jsonb;
begin
  assert pg_temp.qa_current_staff_actor() is null,'missing claims must be denied';
  perform set_config('qa.user_id','00000000-0000-4000-8000-000000000001',true);
  perform set_config('qa.session_id','00000000-0000-4000-8000-000000000002',true);
  actor:=pg_temp.qa_current_staff_actor();
  assert actor->>'role'='manager' and actor->>'login_name'='testmanager','active profile and live session should pass';
  update qa_profiles set active=false;
  assert pg_temp.qa_current_staff_actor() is null,'inactive profile must be denied';
  update qa_profiles set active=true;
  update qa_sessions set not_after=now()-interval '1 second';
  assert pg_temp.qa_current_staff_actor() is null,'expired session must be denied';
  update qa_sessions set not_after=null,user_id='00000000-0000-4000-8000-000000000009';
  assert pg_temp.qa_current_staff_actor() is null,'session must belong to caller';
  update qa_sessions set user_id='00000000-0000-4000-8000-000000000001';
  perform set_config('qa.session_id','00000000-0000-4000-8000-000000000003',true);
  assert pg_temp.qa_current_staff_actor() is null,'different session id must be denied';
  perform set_config('qa.session_id','00000000-0000-4000-8000-000000000002',true);
  update qa_profiles set login_name=null;
  assert pg_temp.qa_current_staff_actor() is null,'unprovisioned profile must be denied';
  update qa_profiles set login_name='testmanager';
  delete from qa_sessions;
  assert pg_temp.qa_current_staff_actor() is null,'revoked session must be denied';
end;
$$;
select 'PASS: 8 actor/session query checks using temporary isolated tables; not an end-to-end JWT/RLS test' as result;
rollback;
