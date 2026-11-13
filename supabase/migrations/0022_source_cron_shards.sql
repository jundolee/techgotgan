-- Keep the database shard assignment byte-for-byte compatible with sourceShard() in
-- src/lib/ingestion/cron-sharding.ts (FNV-1a over the canonical UUID text, modulo 16).
create or replace function public.source_cron_shard(source_id text)
returns smallint
language plpgsql
immutable
strict
parallel safe
as $$
declare
  hash_value bigint := 2166136261;
  index_value integer;
begin
  for index_value in 1..length(source_id) loop
    hash_value := ((hash_value # ascii(substr(source_id, index_value, 1))) * 16777619) % 4294967296;
  end loop;

  return (hash_value % 16)::smallint;
end;
$$;

alter table public.sources
  add column cron_shard smallint generated always as (public.source_cron_shard(id::text)) stored;

create index sources_active_cron_shard_id_idx
  on public.sources (cron_shard, id)
  where is_active = true;
