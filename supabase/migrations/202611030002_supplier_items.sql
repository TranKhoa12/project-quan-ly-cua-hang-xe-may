begin;
create index if not exists purchase_receipts_supplier_history on public.purchase_receipts(supplier_id,created_at desc,id);
create index if not exists purchase_items_purchase_part on public.purchase_items(purchase_id,part_id);
create function public.supplier_purchase_items(p_supplier_id uuid,p_page integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare a jsonb:=public.garage_actor(); result jsonb;
begin
 if a->>'role'<>'manager' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if p_supplier_id is null or p_page is null or p_page<0 or p_page>100000 then raise exception 'VALIDATION_ERROR'; end if;
 if not exists(select 1 from public.suppliers where id=p_supplier_id) then raise exception 'NOT_FOUND'; end if;
 with history as (
  select i.part_id,i.quantity,i.unit_cost,r.created_at,r.code,i.id
  from public.purchase_items i join public.purchase_receipts r on r.id=i.purchase_id
  where r.supplier_id=p_supplier_id
 ), totals as (
  select part_id,sum(quantity) as quantity from history group by part_id
 ), latest as (
  select distinct on (part_id) part_id,unit_cost,created_at from history
  order by part_id,created_at desc,code desc,id desc
 ), page as (
  select p.id as part_id,p.name,p.sku,p.brand,p.sale_price as price,t.quantity,l.unit_cost as last_cost,l.created_at as last_received_at
  from totals t join latest l using(part_id) join public.parts p on p.id=t.part_id
  order by l.created_at desc,p.name,p.id limit 20 offset p_page*20
 )
 select jsonb_build_object('items',coalesce((select jsonb_agg(page) from page),'[]'::jsonb),'total',(select count(*) from totals)) into result;
 return result;
end $$;
revoke all on function public.supplier_purchase_items(uuid,integer) from public,anon,authenticated;
grant execute on function public.supplier_purchase_items(uuid,integer) to authenticated;
commit;
