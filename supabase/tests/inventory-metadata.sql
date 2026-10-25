-- Read-only production inspection. No fixture/business mutation.
select c.relname,c.relrowsecurity,
 has_table_privilege('authenticated',c.oid,'INSERT') as authenticated_insert,
 has_table_privilege('authenticated',c.oid,'UPDATE') as authenticated_update,
 has_table_privilege('anon',c.oid,'SELECT') as anon_select
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('purchase_receipts','purchase_items','cash_entries','garage_requests','repair_quotes','repair_item_costs','sale_returns','store_settings','suppliers') order by c.relname;
select p.proname,p.prosecdef,p.proconfig,
 has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('garage_command','garage_snapshot','garage_actor','garage_integer','garage_text','garage_store','bump_stock_version') order by p.proname;
