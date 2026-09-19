create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;

create function public.save_my_push_subscription(subscription_endpoint text, subscription_p256dh text, subscription_auth text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication is required.' using errcode = '42501'; end if;
  if nullif(btrim(subscription_endpoint), '') is null or nullif(btrim(subscription_p256dh), '') is null or nullif(btrim(subscription_auth), '') is null then
    raise exception 'A complete push subscription is required.' using errcode = '22023';
  end if;
  if exists (select 1 from public.push_subscriptions subscription where subscription.endpoint = subscription_endpoint and subscription.user_id <> (select auth.uid())) then
    raise exception 'This device subscription belongs to another account.' using errcode = '42501';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values ((select auth.uid()), subscription_endpoint, subscription_p256dh, subscription_auth)
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, updated_at = now();
end;
$$;

create function public.delete_my_push_subscription(subscription_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_subscriptions
  where endpoint = subscription_endpoint and user_id = (select auth.uid());
$$;

revoke all on function public.save_my_push_subscription(text, text, text) from public;
revoke all on function public.delete_my_push_subscription(text) from public;
grant execute on function public.save_my_push_subscription(text, text, text) to authenticated;
grant execute on function public.delete_my_push_subscription(text) to authenticated;
