-- Persist a user's read state and increment the shared click counter in one
-- database round trip so navigation does not wait on two separate requests.
create or replace function public.mark_article_read_and_increment_click_count(
  target_user_id uuid,
  target_article_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_article_id is null then
    raise exception 'target_article_id is required';
  end if;

  update public.articles
  set click_count = click_count + 1
  where id = target_article_id;

  if not found then
    raise exception 'article not found';
  end if;

  if target_user_id is not null then
    insert into public.read_status (user_id, article_id, read_at)
    values (target_user_id, target_article_id, now())
    on conflict (user_id, article_id)
    do update set read_at = excluded.read_at;
  end if;
end;
$$;

revoke all on function public.mark_article_read_and_increment_click_count(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.mark_article_read_and_increment_click_count(uuid, uuid)
  to service_role;
