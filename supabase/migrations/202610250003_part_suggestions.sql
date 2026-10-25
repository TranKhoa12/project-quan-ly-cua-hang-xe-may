begin;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create function public.normalize_part_text(p_value text) returns text
language sql immutable strict set search_path = '' as $$
  select trim(regexp_replace(lower(extensions.unaccent('extensions.unaccent'::regdictionary, p_value)), '[^[:alnum:]]+', ' ', 'g'));
$$;

create table public.part_terms (
  id uuid primary key default gen_random_uuid(),
  kind text not null check(kind in ('name','category','brand')),
  name text not null check(length(trim(name)) between 1 and 180),
  normalized_name text generated always as (public.normalize_part_text(name)) stored,
  aliases text[] not null default '{}',
  category text,
  source_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(kind, normalized_name)
);
alter table public.part_terms enable row level security;
revoke all on public.part_terms from anon, authenticated;
grant select on public.part_terms to authenticated;
create policy staff_read_part_terms on public.part_terms for select to authenticated using(public.is_staff());

-- Reference vocabulary only: no products, prices, cost or stock are seeded.
insert into public.part_terms(kind,name,aliases,category,source_url) values
('name','Lọc gió',array['Tấm lọc gió'],'Bộ lọc','https://www.honda.com.vn/xe-may/phu-tung/danh-sach-phu-tung'),
('name','Bugi',array['Bu gi'],'Đánh lửa','https://www.honda.com.vn/xe-may/phu-tung/danh-sach-phu-tung'),
('name','Má phanh đĩa',array['Bố thắng đĩa','Má phanh dầu'],'Hệ thống phanh','https://www.honda.com.vn/xe-may/phu-tung/danh-sach-phu-tung'),
('name','Má phanh tang trống',array['Bố thắng đùm','Bố thắng cơ'],'Hệ thống phanh','https://www.honda.com.vn/xe-may/phu-tung/danh-sach-phu-tung'),
('name','Bộ nhông sên dĩa',array['Bộ nhông xích','Nhông sên đĩa'],'Truyền động xe số','https://www.honda.com.vn/xe-may/phu-tung/danh-sach-phu-tung'),
('name','Ắc quy',array['Bình điện','Bình ắc quy'],'Điện và ắc quy','https://www.honda.com.vn/xe-may/phu-tung/danh-sach-phu-tung'),
('name','Lốp trước',array['Vỏ trước'],'Lốp và ruột xe','https://www.honda.com.vn/xe-may/phu-tung/danh-sach-phu-tung'),
('name','Lốp sau',array['Vỏ sau'],'Lốp và ruột xe','https://www.honda.com.vn/xe-may/phu-tung/danh-sach-phu-tung'),
('name','Lọc nhớt',array['Lọc dầu'],'Bộ lọc','https://global.yamaha-motor.com/business/mc/customer-support/vn/genuine-parts/'),
('name','Dây curoa',array['Dây đai truyền động'],'Truyền động xe ga','https://global.yamaha-motor.com/business/mc/customer-support/vn/genuine-parts/'),
('name','Dầu nhớt động cơ',array['Nhớt máy'],'Dầu nhớt và dung dịch','https://yamaha-motor.com.vn/phu-tung/');
insert into public.part_terms(kind,name) select 'category',name from unnest(array['Dầu nhớt và dung dịch','Bộ lọc','Đánh lửa','Hệ thống phanh','Truyền động xe số','Truyền động xe ga','Điện và ắc quy','Lốp và ruột xe','Động cơ','Khung gầm']) name;
insert into public.part_terms(kind,name) values('brand','Honda'),('brand','Yamaha');

alter table public.parts add column normalized_name text generated always as (public.normalize_part_text(name)) stored;
alter table public.parts add column normalized_brand text generated always as (public.normalize_part_text(brand)) stored;
create unique index parts_name_brand_unique on public.parts(normalized_name, normalized_brand);
create index parts_name_search on public.parts using gin(normalized_name extensions.gin_trgm_ops);

create table public.part_creation_requests (
  actor_id uuid not null references public.profiles(id),
  request_id uuid not null,
  payload jsonb not null,
  part_id uuid not null references public.parts(id),
  created_at timestamptz not null default now(),
  primary key(actor_id,request_id)
);
alter table public.part_creation_requests enable row level security;
revoke all on public.part_creation_requests from anon, authenticated;

create function public.create_part_with_terms(p_name text,p_category text,p_brand text,p_price bigint,p_cost bigint,p_min integer,p_request_id uuid,p_allow_similar boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  n text := trim(regexp_replace(p_name,'\s+',' ','g'));
  c text := trim(regexp_replace(p_category,'\s+',' ','g'));
  b text := trim(regexp_replace(p_brand,'\s+',' ','g'));
  actor uuid := auth.uid();
  payload jsonb;
  previous public.part_creation_requests;
  item public.parts;
  matches jsonb;
begin
  if not public.is_manager() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if n is null or c is null or b is null or length(n) not between 1 and 180 or length(c) not between 1 and 100 or length(b) not between 1 and 100
    or public.normalize_part_text(n)='' or public.normalize_part_text(c)='' or public.normalize_part_text(b)=''
    or p_price is null or p_cost is null or p_min is null or p_request_id is null or p_allow_similar is null
    or p_price not between 0 and 1000000000 or p_cost not between 0 and 1000000000 or p_min not between 0 and 1000000 then
    raise exception 'VALIDATION_ERROR' using errcode='22023';
  end if;
  payload := jsonb_build_object('name',n,'category',c,'brand',b,'price',p_price,'cost',p_cost,'min',p_min);
  perform pg_advisory_xact_lock(hashtextextended(actor::text||p_request_id::text,0));
  select * into previous from public.part_creation_requests where actor_id=actor and request_id=p_request_id;
  if found then
    if previous.payload<>payload then raise exception 'IDEMPOTENCY_CONFLICT' using errcode='22023'; end if;
    select * into item from public.parts where id=previous.part_id;
  else
    select jsonb_agg(jsonb_build_object('id',id,'name',name,'brand',brand,'category',category)) into matches
      from public.parts where normalized_name=public.normalize_part_text(n) and normalized_brand=public.normalize_part_text(b);
    if matches is not null then return jsonb_build_object('status','duplicate','matches',matches); end if;
    if not p_allow_similar then
      select jsonb_agg(jsonb_build_object('id',id,'name',name,'brand',brand,'category',category)) into matches from (
        select id,name,brand,category from public.parts where normalized_brand=public.normalize_part_text(b)
          and extensions.similarity(normalized_name,public.normalize_part_text(n))>=0.55 order by extensions.similarity(normalized_name,public.normalize_part_text(n)) desc limit 5
      ) candidates;
      if matches is not null then return jsonb_build_object('status','similar','matches',matches); end if;
    end if;
    begin
      insert into public.parts(sku,name,category,brand,sale_price,minimum_stock)
      values('PT-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),n,c,b,p_price,p_min) returning * into item;
    exception when unique_violation then
      return jsonb_build_object('status','duplicate','matches',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'brand',brand,'category',category)) from public.parts where normalized_name=public.normalize_part_text(n) and normalized_brand=public.normalize_part_text(b)),'[]'::jsonb));
    end;
    insert into public.part_costs(part_id,average_cost) values(item.id,p_cost);
    insert into public.stock_balances(part_id,quantity) values(item.id,0);
    insert into public.part_terms(kind,name,category,created_by) values('name',n,c,actor) on conflict(kind,normalized_name) do nothing;
    insert into public.part_terms(kind,name,created_by) values('category',c,actor),('brand',b,actor) on conflict(kind,normalized_name) do nothing;
    insert into public.part_creation_requests(actor_id,request_id,payload,part_id) values(actor,p_request_id,payload,item.id);
    insert into public.audit_logs(actor_id,action,entity_id,details) values(actor,'part.created',item.id,jsonb_build_object('sku',item.sku,'request_id',p_request_id));
  end if;
  return jsonb_build_object('status','created','part',jsonb_build_object('id',item.id,'sku',item.sku,'name',item.name,'category',item.category,'brand',item.brand,'price',item.sale_price,'cost',(select average_cost from public.part_costs where part_id=item.id),'min',item.minimum_stock,'stock',(select quantity from public.stock_balances where part_id=item.id)));
end;
$$;
revoke all on function public.create_part_with_terms(text,text,text,bigint,bigint,integer,uuid,boolean) from public, anon;
grant execute on function public.create_part_with_terms(text,text,text,bigint,bigint,integer,uuid,boolean) to authenticated;
commit;
