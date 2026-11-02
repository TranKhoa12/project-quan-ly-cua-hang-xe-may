begin;
alter table public.sales_orders add column cashier_name text,add column cash_received bigint check(cash_received is null or (payment_method='cash' and cash_received>=total and cash_received<=1000000000000));

create function public.snapshot_sale_cashier() returns trigger language plpgsql security definer set search_path='' as $$
begin
 select p.full_name into new.cashier_name from public.profiles p where p.id=new.created_by;
 return new;
end $$;
revoke all on function public.snapshot_sale_cashier() from public,anon,authenticated;
create trigger sale_cashier_snapshot before insert on public.sales_orders for each row execute function public.snapshot_sale_cashier();

create or replace function public.pos_receipt(p_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',s.id,'code',s.code,'customer_name',s.customer_name,'total',s.total,
 'payment_method',s.payment_method,'created_at',s.created_at,'store_snapshot',s.store_snapshot,
 'cashier_name',s.cashier_name,'cash_received',s.cash_received,
 'items',(select jsonb_agg(jsonb_build_object('id',i.id,'name',i.name_snapshot,'quantity',i.quantity,'price',i.unit_price,'returned',0)) from public.sales_order_items i where i.sale_id=s.id))
 from public.sales_orders s where s.id=p_id
$$;
revoke all on function public.pos_receipt(uuid) from public,anon,authenticated;

alter function public.garage_command(text,jsonb,uuid) rename to garage_command_inventory;
revoke all on function public.garage_command_inventory(text,jsonb,uuid) from public,anon,authenticated;
create function public.garage_command(p_action text,p_payload jsonb,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a jsonb:=public.garage_actor(); result jsonb; sale uuid;
begin
 result:=public.garage_command_inventory(p_action,p_payload,p_request_id);
 if p_action='sale' then
  sale:=(result->>'id')::uuid;
  -- Previous command validates the received amount and prices in this transaction.
  -- Never backfill old receipts or use current staff/store data when reprinting.
  if p_payload->>'method'='cash' and p_payload?'cashReceived' then
   update public.sales_orders set cash_received=public.garage_integer(p_payload->'cashReceived',0,1000000000000)
   where id=sale and cash_received is null and cashier_name is not null;
  end if;
  result:=result||jsonb_build_object('receipt',public.pos_receipt(sale));
  update public.pos_drafts set body=body||jsonb_build_object('receipt',result->'receipt')
  where actor_id=(a->>'id')::uuid and request_id=p_request_id and status='completed';
 end if;
 return result;
end $$;
revoke all on function public.garage_command(text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.garage_command(text,jsonb,uuid) to authenticated;

create or replace function public.garage_snapshot(p_section text,p_page integer default 0,p_from date default null,p_to date default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb; rows jsonb;
begin
 result:=public.garage_snapshot_base(p_section,p_page,p_from,p_to);
 select coalesce(jsonb_agg(e.value||jsonb_build_object('pos_visible',p.pos_visible) order by e.ord),'[]') into rows
 from jsonb_array_elements(result->'parts') with ordinality e(value,ord) join public.parts p on p.id=(e.value->>'id')::uuid;
 result:=result||jsonb_build_object('parts',rows);
 if result?'suppliers' then
  select coalesce(jsonb_agg(e.value||jsonb_build_object('details_version',s.details_version) order by e.ord),'[]') into rows
  from jsonb_array_elements(result->'suppliers') with ordinality e(value,ord) join public.suppliers s on s.id=(e.value->>'id')::uuid;
  result:=result||jsonb_build_object('suppliers',rows);
 end if;
 if result?'sales' then
  select coalesce(jsonb_agg(e.value||jsonb_build_object('cashier_name',s.cashier_name,'cash_received',s.cash_received) order by e.ord),'[]') into rows
  from jsonb_array_elements(result->'sales') with ordinality e(value,ord) join public.sales_orders s on s.id=(e.value->>'id')::uuid;
  result:=result||jsonb_build_object('sales',rows);
 end if;
 return result;
end $$;
revoke all on function public.garage_snapshot(text,integer,date,date) from public,anon,authenticated;
grant execute on function public.garage_snapshot(text,integer,date,date) to authenticated;
commit;
