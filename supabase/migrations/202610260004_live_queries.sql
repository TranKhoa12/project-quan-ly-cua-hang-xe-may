begin;
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path='' as $$ select public.current_staff_actor() is not null $$;
create or replace function public.is_manager() returns boolean language sql stable security definer set search_path='' as $$ select coalesce(public.current_staff_actor()->>'role'='manager',false) $$;
create or replace function public.has_shop_role(p_roles public.staff_role[]) returns boolean language sql stable security definer set search_path='' as $$ select coalesce((public.current_staff_actor()->>'role')::public.staff_role=any(p_roles),false) $$;
-- Customer snapshot includes a phone: read it only through the scoped RPC.
revoke select on public.repair_orders from authenticated;
grant select(id,code,vehicle_id,issue,status,technician_id,labor_amount,created_by,created_at,delivered_at,version,km,store_snapshot,quality_note) on public.repair_orders to authenticated;

create function public.garage_store() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform public.garage_actor();
 return (select to_jsonb(s)-'id' from public.store_settings s where id);
end $$;
revoke all on function public.garage_store() from public,anon,authenticated;
grant execute on function public.garage_store() to authenticated;

create function public.garage_snapshot(p_section text,p_page integer default 0,p_from date default null,p_to date default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare a jsonb:=public.garage_actor(); manager boolean:=a->>'role'='manager'; technician boolean:=a->>'role'='technician';
 actor uuid:=(a->>'id')::uuid; result jsonb; rows jsonb; start_at timestamptz; end_at timestamptz;
begin
 if p_page is null or p_page not between 0 and 100000 or p_section not in ('dashboard','repairs','sales','parts','purchases','customers','cashbook','reports','settings') then raise exception 'VALIDATION_ERROR'; end if;
 if not manager and p_section in ('purchases','cashbook','reports','settings') or technician and p_section in ('sales','customers') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 start_at:=coalesce(p_from,date_trunc('month',now() at time zone 'Asia/Ho_Chi_Minh')::date)::timestamp at time zone 'Asia/Ho_Chi_Minh';
 end_at:=(coalesce(p_to,(now() at time zone 'Asia/Ho_Chi_Minh')::date)+1)::timestamp at time zone 'Asia/Ho_Chi_Minh';
 if end_at<=start_at or end_at-start_at>interval '367 days' then raise exception 'VALIDATION_ERROR'; end if;
 select jsonb_build_object('store',to_jsonb(st)-'id','page',p_page,'from',start_at,'to',end_at) into result from public.store_settings st where id;
 -- Master choices are bounded explicitly; list pages and financial totals are independent.
 select coalesce(jsonb_agg(x),'[]') into rows from (
  select p.id,p.sku,p.name,p.category,p.brand,p.sale_price as price,p.minimum_stock as min,coalesce(sb.quantity,0) as stock,sb.version as stock_version,
   case when manager then pc.average_cost else null end as cost
  from public.parts p left join public.stock_balances sb on sb.part_id=p.id left join public.part_costs pc on pc.part_id=p.id
  where p.active order by p.name limit 2000
 ) x;
 if not manager then select coalesce(jsonb_agg(x-'cost'),'[]') into rows from jsonb_array_elements(rows) x; end if;
 result:=result||jsonb_build_object('parts',rows,'partCount',(select count(*) from public.parts where active));
 if not technician then
  select coalesce(jsonb_agg(x),'[]') into rows from (select c.id,c.name,c.phone,c.address from public.customers c order by c.created_at desc limit 50 offset p_page*50) x;
  result:=result||jsonb_build_object('customers',rows,'customerCount',(select count(*) from public.customers));
  select coalesce(jsonb_agg(x),'[]') into rows from (
   select v.id,v.customer_id,v.plate,v.model,c.name as customer,c.phone from public.vehicles v join public.customers c on c.id=v.customer_id order by v.created_at desc limit 2000
  ) x;
  result:=result||jsonb_build_object('vehicles',rows,'vehicleCount',(select count(*) from public.vehicles));
  select coalesce(jsonb_agg(x),'[]') into rows from(select id,full_name,role from public.profiles where active and role in ('manager','technician') order by full_name) x;
  result:=result||jsonb_build_object('technicians',rows);
 end if;
 if p_section in ('dashboard','repairs') then
  select coalesce(jsonb_agg(x),'[]') into rows from (
   select r.id,r.code,r.issue,r.status,r.version,r.km,r.technician_id,p.full_name as technician,r.created_at,r.delivered_at,r.quality_note,r.store_snapshot,
    case when technician then r.customer_snapshot-'phone' else r.customer_snapshot end as customer,
    (select to_jsonb(q)-'created_by' from public.repair_quotes q where q.repair_id=r.id order by q.version desc limit 1) as quote,
    (select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'partId',i.part_id,'name',i.name_snapshot,'quantity',i.quantity,'price',i.unit_price)),'[]') from public.repair_part_items i where i.repair_id=r.id) as items,
    case when technician then null else (select coalesce(sum(pay.amount),0) from public.payments pay where pay.repair_id=r.id) end as paid
   from public.repair_orders r left join public.profiles p on p.id=r.technician_id where not technician or r.technician_id=actor
   order by r.created_at desc limit 50 offset p_page*50
  ) x;
  result:=result||jsonb_build_object('repairs',rows,'repairCount',(select count(*) from public.repair_orders where not technician or technician_id=actor));
 end if;
 if p_section='sales' then
  select coalesce(jsonb_agg(x),'[]') into rows from (
   select s.id,s.code,s.customer_name,s.total,s.payment_method,s.created_at,s.store_snapshot,
    (select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'name',i.name_snapshot,'quantity',i.quantity,'price',i.unit_price,'returned',coalesce((select sum(rt.quantity) from public.sale_returns rt where rt.item_id=i.id),0))),'[]') from public.sales_order_items i where i.sale_id=s.id) as items
   from public.sales_orders s order by created_at desc limit 50 offset p_page*50
  ) x;
  result:=result||jsonb_build_object('sales',rows,'saleCount',(select count(*) from public.sales_orders));
 end if;
 if manager and p_section='purchases' then
  select coalesce(jsonb_agg(x),'[]') into rows from(select id,name,phone from public.suppliers order by name limit 2000) x;
  result:=result||jsonb_build_object('suppliers',rows,'supplierCount',(select count(*) from public.suppliers));
  select coalesce(jsonb_agg(x),'[]') into rows from (
   select pr.id,pr.code,pr.total,pr.supplier_snapshot,pr.store_snapshot,pr.created_at,
    (select coalesce(sum(ce.amount),0) from public.cash_entries ce where ce.purchase_id=pr.id) as paid,
    (select coalesce(jsonb_agg(jsonb_build_object('name',i.name_snapshot,'quantity',i.quantity,'cost',i.unit_cost)),'[]') from public.purchase_items i where i.purchase_id=pr.id) as items
   from public.purchase_receipts pr order by pr.created_at desc limit 50 offset p_page*50
  ) x;
  result:=result||jsonb_build_object('purchases',rows,'purchaseCount',(select count(*) from public.purchase_receipts));
 end if;
 if manager and p_section in ('purchases','parts') then
  select coalesce(jsonb_agg(x),'[]') into rows from (
   select m.id,m.part_id,p.name,m.quantity,m.reason,m.created_at,m.purchase_id,m.sale_id,m.repair_id
   from public.stock_movements m join public.parts p on p.id=m.part_id order by m.created_at desc limit 50 offset p_page*50
  ) x;
  result:=result||jsonb_build_object('movements',rows,'movementCount',(select count(*) from public.stock_movements));
 end if;
 if manager and p_section='cashbook' then
  select coalesce(jsonb_agg(x),'[]') into rows from (
   select ce.*,p.full_name as actor from public.cash_entries ce left join public.profiles p on p.id=ce.created_by where ce.created_at>=start_at and ce.created_at<end_at order by ce.created_at desc limit 50 offset p_page*50
  ) x;
  result:=result||jsonb_build_object('cash',rows,'cashCount',(select count(*) from public.cash_entries where created_at>=start_at and created_at<end_at));
 end if;
 if manager and p_section in ('dashboard','cashbook','reports') then
  result:=result||jsonb_build_object('summary',jsonb_build_object(
   'sales',(select coalesce(sum(total),0) from public.sales_orders where created_at>=start_at and created_at<end_at),
   'repairs',(select coalesce(sum(q.total),0) from public.repair_orders r join public.repair_quotes q on q.repair_id=r.id and q.approved_at is not null where r.status='delivered' and r.delivered_at>=start_at and r.delivered_at<end_at),
   'refunds',(select coalesce(sum(refund),0) from public.sale_returns where created_at>=start_at and created_at<end_at),
   'cost',(select coalesce(sum(i.quantity*c.unit_cost),0) from public.sales_order_items i join public.sale_item_costs c on c.item_id=i.id join public.sales_orders s on s.id=i.sale_id where s.created_at>=start_at and s.created_at<end_at)
      +(select coalesce(sum(i.quantity*c.unit_cost),0) from public.repair_part_items i join public.repair_item_costs c on c.item_id=i.id join public.repair_orders r on r.id=i.repair_id where r.status='delivered' and r.delivered_at>=start_at and r.delivered_at<end_at)
      -(select coalesce(sum(rt.quantity*c.unit_cost),0) from public.sale_returns rt join public.sale_item_costs c on c.item_id=rt.item_id where rt.created_at>=start_at and rt.created_at<end_at),
   'received',(select coalesce(sum(amount),0) from public.cash_entries where direction='in' and created_at>=start_at and created_at<end_at),
   'spent',(select coalesce(sum(amount),0) from public.cash_entries where direction='out' and created_at>=start_at and created_at<end_at),
   'payable',(select coalesce(sum(total),0) from public.purchase_receipts)-(select coalesce(sum(amount),0) from public.cash_entries where purchase_id is not null),
   'receivable',(select coalesce(sum(q.total),0) from public.repair_orders r join public.repair_quotes q on q.repair_id=r.id and q.approved_at is not null where r.status not in ('cancelled','received','awaiting_approval'))-(select coalesce(sum(amount),0) from public.payments where repair_id is not null),
   'inventoryValue',(select coalesce(sum(sb.quantity*c.average_cost),0) from public.stock_balances sb join public.part_costs c on c.part_id=sb.part_id),
   'activeRepairs',(select count(*) from public.repair_orders where status not in ('delivered','cancelled')),
   'lowStock',(select count(*) from public.parts p join public.stock_balances sb on sb.part_id=p.id where p.active and sb.quantity<=p.minimum_stock)
  ));
 end if;
 return result;
end $$;
revoke all on function public.garage_snapshot(text,integer,date,date) from public,anon,authenticated;
grant execute on function public.garage_snapshot(text,integer,date,date) to authenticated;
commit;
