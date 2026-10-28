-- Cache evidence-based explanations for public article-to-article recommendations.
-- Source and target are directional so quoted evidence remains tied to the correct article.
create table if not exists public.article_connection_insights (
  source_article_id uuid not null references public.articles(id) on delete cascade,
  related_article_id uuid not null references public.articles(id) on delete cascade,
  source_fingerprint text not null,
  related_fingerprint text not null,
  prompt_version text not null,
  model text not null,
  relation text not null check (relation in ('shared_problem', 'shared_approach', 'complementary', 'contrast', 'insufficient_evidence')),
  explanation text not null check (char_length(explanation) between 1 and 600),
  source_evidence text check (source_evidence is null or char_length(source_evidence) <= 500),
  related_evidence text check (related_evidence is null or char_length(related_evidence) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (source_article_id, related_article_id),
  check (source_article_id <> related_article_id)
);

create index if not exists article_connection_insights_updated_idx
  on public.article_connection_insights (updated_at desc);

alter table public.article_connection_insights enable row level security;
revoke all on public.article_connection_insights from public, anon, authenticated;
grant all on public.article_connection_insights to service_role;

-- Store only a daily HMAC of the requester address; no raw IP address is retained.
create table if not exists public.article_connection_insight_usage (
  usage_day date not null,
  requester_hash text not null check (char_length(requester_hash) = 64),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (usage_day, requester_hash)
);

alter table public.article_connection_insight_usage enable row level security;
revoke all on public.article_connection_insight_usage from public, anon, authenticated;
grant all on public.article_connection_insight_usage to service_role;

create or replace function public.consume_article_connection_insight_request(
  requested_day date,
  requested_hash text,
  daily_limit integer default 12
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed boolean := false;
  safe_limit integer := least(greatest(coalesce(daily_limit, 12), 1), 30);
begin
  if requested_day is null or requested_hash is null or char_length(requested_hash) <> 64 then
    return false;
  end if;

  insert into public.article_connection_insight_usage as quota (
    usage_day, requester_hash, request_count, updated_at
  )
  values (requested_day, requested_hash, 1, now())
  on conflict (usage_day, requester_hash) do update
    set request_count = quota.request_count + 1,
        updated_at = now()
    where quota.request_count < safe_limit
  returning true into allowed;

  delete from public.article_connection_insight_usage
  where usage_day < current_date - 7;

  return coalesce(allowed, false);
end;
$$;

revoke all on function public.consume_article_connection_insight_request(date, text, integer)
  from public, anon, authenticated;
grant execute on function public.consume_article_connection_insight_request(date, text, integer)
  to service_role;
