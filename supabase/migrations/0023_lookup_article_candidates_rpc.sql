create or replace function public.lookup_article_candidates(
  p_source_id uuid,
  p_dedup_keys text[],
  p_canonical_urls text[]
)
returns table (
  id uuid,
  dedup_key text,
  canonical_url text,
  discovered_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select article.id, article.dedup_key, article.canonical_url, article.discovered_at
  from public.articles as article
  where (
    article.source_id = p_source_id
    and article.dedup_key = any(coalesce(p_dedup_keys, array[]::text[]))
  ) or article.canonical_url = any(coalesce(p_canonical_urls, array[]::text[]));
$$;

revoke all on function public.lookup_article_candidates(uuid, text[], text[])
  from public, anon, authenticated;
grant execute on function public.lookup_article_candidates(uuid, text[], text[])
  to service_role;
create or replace function public.lookup_article_candidates(
  p_source_id uuid,
  p_dedup_keys text[],
  p_canonical_urls text[]
)
returns table (
  id uuid,
  dedup_key text,
  canonical_url text,
  discovered_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select article.id, article.dedup_key, article.canonical_url, article.discovered_at
  from public.articles as article
  where (
    article.source_id = p_source_id
    and article.dedup_key = any(coalesce(p_dedup_keys, array[]::text[]))
  ) or article.canonical_url = any(coalesce(p_canonical_urls, array[]::text[]));
$$;

revoke all on function public.lookup_article_candidates(uuid, text[], text[])
  from public, anon, authenticated;
grant execute on function public.lookup_article_candidates(uuid, text[], text[])
  to service_role;
