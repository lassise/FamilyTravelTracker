-- 1) Share links (token -> owner)
create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  token text not null,
  is_active boolean not null default true,
  include_stats boolean not null default true,
  include_countries boolean not null default true,
  include_memories boolean not null default true,
  created_at timestamptz not null default now(),
  last_accessed_at timestamptz null
);

create unique index if not exists share_links_token_unique on public.share_links (token);
create unique index if not exists share_links_owner_unique on public.share_links (owner_user_id);

alter table public.share_links enable row level security;

-- Owners manage their own share link
create policy "Users can view own share links"
on public.share_links
for select
using (auth.uid() = owner_user_id);

create policy "Users can insert own share links"
on public.share_links
for insert
with check (auth.uid() = owner_user_id);

create policy "Users can update own share links"
on public.share_links
for update
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

create policy "Users can delete own share links"
on public.share_links
for delete
using (auth.uid() = owner_user_id);

-- 2) Memories shareability flag
alter table public.travel_photos
add column if not exists is_shareable boolean not null default false;

-- Backfill existing photos to shareable so we don't suddenly break current shared dashboards.
update public.travel_photos
set is_shareable = true
where is_shareable = false;

-- 3) Single-call payload fetch for /share/:token
create or replace function public.get_shared_dashboard(token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.share_links%rowtype;
  v_profile public.profiles%rowtype;
  v_payload jsonb;
begin
  -- Basic token validation: 32 hex chars
  if token is null or length(token) != 32 or token !~ '^[a-f0-9]+$' then
    return null;
  end if;

  select * into v_link
  from public.share_links sl
  where sl.token = token
    and sl.is_active = true
  limit 1;

  if not found then
    return null;
  end if;

  update public.share_links
  set last_accessed_at = now()
  where id = v_link.id;

  select * into v_profile
  from public.profiles p
  where p.id = v_link.owner_user_id
  limit 1;

  -- Assemble payload
  v_payload := jsonb_build_object(
    'owner', jsonb_build_object(
      'user_id', v_link.owner_user_id,
      'full_name', v_profile.full_name,
      'home_country', v_profile.home_country
    ),
    'share', jsonb_build_object(
      'token', v_link.token,
      'include_stats', v_link.include_stats,
      'include_countries', v_link.include_countries,
      'include_memories', v_link.include_memories
    ),
    'countries', (
      select coalesce(jsonb_agg(to_jsonb(c) order by c.name), '[]'::jsonb)
      from (
        select id, name, flag, continent
        from public.countries
        where user_id = v_link.owner_user_id
      ) c
    ),
    'visited_country_ids', (
      select coalesce(jsonb_agg(distinct cv.country_id), '[]'::jsonb)
      from public.country_visits cv
      where cv.user_id = v_link.owner_user_id
        and cv.country_id is not null
    ),
    'visit_details', (
      select coalesce(jsonb_agg(to_jsonb(vd) order by vd.visit_date desc nulls last, vd.created_at desc), '[]'::jsonb)
      from (
        select id, country_id, visit_date, end_date, is_approximate, approximate_month, approximate_year, trip_name, highlight
        from public.country_visit_details
        where user_id = v_link.owner_user_id
      ) vd
    ),
    'state_visits', (
      select coalesce(jsonb_agg(to_jsonb(sv)), '[]'::jsonb)
      from (
        select id, country_code, state_code, state_name
        from public.state_visits
        where user_id = v_link.owner_user_id
      ) sv
    ),
    'photos', (
      select case when v_link.include_memories then
        (
          select coalesce(jsonb_agg(to_jsonb(tp) order by tp.taken_at desc nulls last, tp.created_at desc), '[]'::jsonb)
          from (
            select id, country_id, taken_at, photo_url, caption
            from public.travel_photos
            where user_id = v_link.owner_user_id
              and is_shareable = true
          ) tp
        )
      else
        '[]'::jsonb
      end
    )
  );

  return v_payload;
end;
$$;

grant execute on function public.get_shared_dashboard(text) to anon, authenticated;