-- Apply manually in the Supabase Dashboard SQL Editor for project efwfmebvvnxumuvydbrq.
-- The database timezone is UTC and pg_cron reports GMT; the schedules below are UTC.
-- Requires the Vault secret `github_actions_dispatch_token_r1` with Actions:write on
-- jundolee/techgotgan. No credential value belongs in this file.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create schema if not exists techgotgan_internal;

create or replace function techgotgan_internal.dispatch_ingestion_task(p_task text)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, techgotgan_internal, vault, net
as $function$
declare
  github_token text;
  request_id bigint;
begin
  if p_task not in ('ingest-first', 'ingest-retry', 'ingest-catchup') then
    raise exception 'Unsupported Techgotgan ingestion task: %', p_task;
  end if;

  select decrypted_secret
  into github_token
  from vault.decrypted_secrets
  where name = 'github_actions_dispatch_token_r1';

  if nullif(github_token, '') is null then
    raise exception 'Vault secret github_actions_dispatch_token_r1 is missing';
  end if;

  select net.http_post(
    url := 'https://api.github.com/repos/jundolee/techgotgan/actions/workflows/techgotgan-maintenance.yml/dispatches',
    headers := jsonb_build_object(
      'Accept', 'application/vnd.github+json',
      'Authorization', 'Bearer ' || github_token,
      'X-GitHub-Api-Version', '2022-11-28',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'ref', 'main',
      'inputs', jsonb_build_object('task', p_task)
    ),
    timeout_milliseconds := 10_000
  ) into request_id;

  return request_id;
end;
$function$;

revoke all on function techgotgan_internal.dispatch_ingestion_task(text) from public;
grant usage on schema techgotgan_internal to postgres;
grant execute on function techgotgan_internal.dispatch_ingestion_task(text) to postgres;

select cron.schedule(
  'techgotgan-ingest-first',
  '15 22 * * *',
  $job$ select techgotgan_internal.dispatch_ingestion_task('ingest-first'); $job$
);

select cron.schedule(
  'techgotgan-ingest-retry',
  '15 23 * * *',
  $job$ select techgotgan_internal.dispatch_ingestion_task('ingest-retry'); $job$
);

select cron.schedule(
  'techgotgan-ingest-catchup-0947',
  '47 0 * * *',
  $job$ select techgotgan_internal.dispatch_ingestion_task('ingest-catchup'); $job$
);

select cron.schedule(
  'techgotgan-ingest-catchup-1017',
  '17 1 * * *',
  $job$ select techgotgan_internal.dispatch_ingestion_task('ingest-catchup'); $job$
);

select cron.schedule(
  'techgotgan-ingest-catchup-1117',
  '17 2 * * *',
  $job$ select techgotgan_internal.dispatch_ingestion_task('ingest-catchup'); $job$
);

select cron.schedule(
  'techgotgan-ingest-catchup-1217',
  '17 3 * * *',
  $job$ select techgotgan_internal.dispatch_ingestion_task('ingest-catchup'); $job$
);

-- Verify the jobs after applying:
-- select jobid, jobname, schedule, active
-- from cron.job
-- where jobname like 'techgotgan-ingest-%'
-- order by jobname;

-- Smoke-test the GitHub dispatch once if desired:
-- select techgotgan_internal.dispatch_ingestion_task('ingest-catchup');
