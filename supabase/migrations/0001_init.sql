-- Trailbound schema. Run once in the Supabase SQL editor (or `supabase db push`).

create table if not exists public.trips (
  id uuid primary key,
  owner uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  invite_code text not null unique,
  published_slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trip_members (
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'crew',
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create table if not exists public.rides (
  id uuid primary key,
  trip_id uuid not null references public.trips (id) on delete cascade,
  added_by uuid references auth.users (id) on delete set null,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists rides_trip_idx on public.rides (trip_id);

create table if not exists public.media (
  id uuid primary key,
  trip_id uuid not null references public.trips (id) on delete cascade,
  added_by uuid references auth.users (id) on delete set null,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists media_trip_idx on public.media (trip_id);

-- Membership check used by every policy. SECURITY DEFINER so it can read trip_members without recursing through RLS.
create or replace function public.is_trip_member(t uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.trips where id = t and owner = auth.uid())
      or exists (select 1 from public.trip_members where trip_id = t and user_id = auth.uid());
$$;

alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.rides enable row level security;
alter table public.media enable row level security;

drop policy if exists trips_select on public.trips;
create policy trips_select on public.trips for select to authenticated
  using (owner = auth.uid() or public.is_trip_member(id));
drop policy if exists trips_insert on public.trips;
create policy trips_insert on public.trips for insert to authenticated
  with check (owner = auth.uid());
drop policy if exists trips_update on public.trips;
create policy trips_update on public.trips for update to authenticated
  using (public.is_trip_member(id)) with check (public.is_trip_member(id));
drop policy if exists trips_delete on public.trips;
create policy trips_delete on public.trips for delete to authenticated
  using (owner = auth.uid());

drop policy if exists members_select on public.trip_members;
create policy members_select on public.trip_members for select to authenticated
  using (public.is_trip_member(trip_id));
drop policy if exists members_delete on public.trip_members;
create policy members_delete on public.trip_members for delete to authenticated
  using (user_id = auth.uid());
-- Rows are only inserted by join_trip() below.

drop policy if exists rides_all on public.rides;
create policy rides_all on public.rides for all to authenticated
  using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));
drop policy if exists media_all on public.media;
create policy media_all on public.media for all to authenticated
  using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));

-- Join a trip with its invite code.
create or replace function public.join_trip(code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select id into t from public.trips where invite_code = code;
  if t is null then return null; end if;
  insert into public.trip_members (trip_id, user_id) values (t, auth.uid()) on conflict do nothing;
  return t;
end $$;
revoke all on function public.join_trip(text) from public, anon;
grant execute on function public.join_trip(text) to authenticated;

-- Read a published book by its slug. Callable without signing in; returns only that one trip.
create or replace function public.get_published(slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'trip', jsonb_build_object('id', t.id, 'data', t.data - 'inviteCode', 'invite_code', '', 'published_slug', t.published_slug),
    'rides', coalesce((select jsonb_agg(r.data) from public.rides r where r.trip_id = t.id), '[]'::jsonb),
    'media', coalesce((select jsonb_agg(m.data) from public.media m where m.trip_id = t.id), '[]'::jsonb))
  from public.trips t where t.published_slug = slug and slug is not null;
$$;
grant execute on function public.get_published(text) to anon, authenticated;

-- Storage: one public-read bucket. Object names are {trip uuid}/{media uuid}-…, so URLs are unguessable,
-- but anyone holding a URL can view that file. Only trip members can write.
insert into storage.buckets (id, name, public) values ('trip-media', 'trip-media', true)
  on conflict (id) do nothing;

drop policy if exists trip_media_insert on storage.objects;
create policy trip_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'trip-media' and public.is_trip_member(((storage.foldername(name))[1])::uuid));
drop policy if exists trip_media_update on storage.objects;
create policy trip_media_update on storage.objects for update to authenticated
  using (bucket_id = 'trip-media' and public.is_trip_member(((storage.foldername(name))[1])::uuid));
drop policy if exists trip_media_delete on storage.objects;
create policy trip_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'trip-media' and public.is_trip_member(((storage.foldername(name))[1])::uuid));
drop policy if exists trip_media_select on storage.objects;
create policy trip_media_select on storage.objects for select to authenticated
  using (bucket_id = 'trip-media' and public.is_trip_member(((storage.foldername(name))[1])::uuid));
