-- =====================================================================
-- Breathing Point Care  -  PHASE 1 (provider registration, admin review,
-- schedule publishing).  Run once in Supabase > SQL Editor.
-- Patient registration, 6 km search and booking come in Phase 2.
-- =====================================================================

-- ---------- ENUMS ----------
create type provider_type   as enum ('yoga_teacher', 'physiotherapist');
create type provider_status as enum ('pending', 'approved', 'rejected');
create type offering_kind   as enum ('physio_clinic', 'physio_home', 'yoga_group', 'yoga_home');
create type admin_scope     as enum ('yoga', 'physio');

-- ---------- ADMINS (yoga_admin / phy_admin) ----------
create table admins (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  scope    admin_scope not null
);

-- true when the signed-in user is the admin responsible for this provider type
create or replace function is_admin_for(p provider_type) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from admins a
    where a.user_id = auth.uid()
      and a.scope = (case p when 'yoga_teacher' then 'yoga'::admin_scope else 'physio'::admin_scope end)
  );
$$;

-- ---------- PROVIDERS (registration) ----------
create table providers (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null unique references auth.users(id) on delete cascade,
  provider_type    provider_type not null,
  full_name        text not null check (char_length(full_name) between 2 and 120),
  mobile           text not null check (mobile ~ '^\+91[6-9][0-9]{9}$'),
  email            text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  address          text not null check (char_length(address) between 5 and 300),
  city             text not null,
  state            text not null,
  pincode          text not null check (pincode ~ '^[0-9]{6}$'),
  latitude         double precision check (latitude  between -90  and 90),
  longitude        double precision check (longitude between -180 and 180),
  certificate_no   text not null check (char_length(certificate_no) >= 3),
  certificate_path text not null,                       -- file in private bucket "certificates"
  status           provider_status not null default 'pending',
  reject_reason    text,
  reviewed_by      uuid references auth.users(id),
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index providers_status_idx on providers (provider_type, status);

-- Providers may edit their own row, but never approve themselves.
create or replace function providers_guard() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.reject_reason := null; new.reviewed_by := null; new.reviewed_at := null;
    return new;
  end if;

  -- the review_provider() function sets this flag for the current transaction only
  if coalesce(current_setting('care.reviewing', true), '') = 'on' then
    return new;
  end if;

  if new.user_id <> old.user_id or new.provider_type <> old.provider_type then
    raise exception 'Account and provider type cannot be changed';
  end if;
  new.reviewed_by := old.reviewed_by;
  new.reviewed_at := old.reviewed_at;
  new.reject_reason := old.reject_reason;

  if old.status = 'rejected' and new.status = 'pending' then
    null;                                   -- resubmission after rejection is allowed
  elsif new.status <> old.status then
    raise exception 'Status can only be changed by an administrator';
  end if;

  if old.status = 'approved' and (
       new.certificate_no <> old.certificate_no
    or new.certificate_path <> old.certificate_path
    or new.full_name <> old.full_name) then
    raise exception 'Name and certificate of an approved registration cannot be edited';
  end if;
  return new;
end $$;
create trigger providers_guard_trg before insert or update on providers
  for each row execute function providers_guard();

-- Admin decision. Rejection REQUIRES a reason so the provider knows what to fix.
create or replace function review_provider(p_provider_id uuid, p_decision text, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v providers%rowtype;
begin
  select * into v from providers where id = p_provider_id;
  if not found then raise exception 'Registration not found'; end if;
  if not is_admin_for(v.provider_type) then raise exception 'Not authorised'; end if;
  if v.status <> 'pending' then raise exception 'This registration has already been reviewed'; end if;

  perform set_config('care.reviewing', 'on', true);
  if p_decision = 'approve' then
    update providers set status = 'approved', reject_reason = null,
           reviewed_by = auth.uid(), reviewed_at = now() where id = p_provider_id;
  elsif p_decision = 'reject' then
    if p_reason is null or char_length(btrim(p_reason)) < 10 then
      raise exception 'Please give a rejection reason (at least 10 characters)';
    end if;
    update providers set status = 'rejected', reject_reason = btrim(p_reason),
           reviewed_by = auth.uid(), reviewed_at = now() where id = p_provider_id;
  else
    raise exception 'Decision must be approve or reject';
  end if;
  perform set_config('care.reviewing', 'off', true);
end $$;

-- ---------- OFFERINGS (what a provider publishes) ----------
--  physio_clinic : clinic visit timings, rate per session
--  physio_home   : home visits in 45-minute slots, rate per session
--  yoga_group    : one row per 1-hour batch, rate per month (several batches allowed)
--  yoga_home     : home visits in 1-hour slots, rate per session and/or per month
create table offerings (
  id               uuid primary key default gen_random_uuid(),
  provider_id      uuid not null references providers(id) on delete cascade,
  kind             offering_kind not null,
  label            text check (char_length(label) <= 60),
  slot_minutes     integer not null,
  rate_per_session numeric(10,2) check (rate_per_session >= 0),
  rate_per_month   numeric(10,2) check (rate_per_month  >= 0),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  constraint offering_rules check (
       (kind = 'physio_clinic' and slot_minutes between 15 and 120 and rate_per_session is not null and rate_per_month is null)
    or (kind = 'physio_home'   and slot_minutes = 45 and rate_per_session is not null and rate_per_month is null)
    or (kind = 'yoga_group'    and slot_minutes = 60 and rate_per_month   is not null and rate_per_session is null)
    or (kind = 'yoga_home'     and slot_minutes = 60 and (rate_per_session is not null or rate_per_month is not null))
  )
);
-- only yoga batches can repeat; every other kind exists once per provider
create unique index offerings_one_per_kind on offerings (provider_id, kind) where kind <> 'yoga_group';

create or replace function offerings_guard() returns trigger
language plpgsql as $$
begin
  if not exists (
    select 1 from providers p
    where p.id = new.provider_id and p.status = 'approved'
      and ((p.provider_type = 'physiotherapist' and new.kind in ('physio_clinic', 'physio_home'))
        or (p.provider_type = 'yoga_teacher'    and new.kind in ('yoga_group', 'yoga_home')))
  ) then
    raise exception 'Only approved providers can publish, and only services that match their profession';
  end if;
  return new;
end $$;
create trigger offerings_guard_trg before insert or update on offerings
  for each row execute function offerings_guard();

-- weekly time windows
create table availability (
  id          uuid primary key default gen_random_uuid(),
  offering_id uuid not null references offerings(id) on delete cascade,
  weekday     smallint not null check (weekday between 0 and 6),   -- 0 = Sunday
  start_time  time not null,
  end_time    time not null,
  check (end_time > start_time)
);
create index availability_offering_idx on availability (offering_id, weekday);

create or replace function availability_guard() returns trigger
language plpgsql as $$
declare o offerings%rowtype; minutes integer;
begin
  select * into o from offerings where id = new.offering_id;
  minutes := (extract(epoch from (new.end_time - new.start_time)) / 60)::integer;

  if o.kind = 'yoga_group' and minutes <> 60 then
    raise exception 'A yoga batch must be exactly 1 hour long';
  elsif minutes % o.slot_minutes <> 0 then
    raise exception 'Time window must be a multiple of % minutes', o.slot_minutes;
  end if;

  -- no overlapping windows anywhere in this provider's schedule
  if exists (
    select 1 from availability a
    join offerings o2 on o2.id = a.offering_id
    where o2.provider_id = o.provider_id
      and a.weekday = new.weekday
      and a.id <> new.id
      and a.start_time < new.end_time and a.end_time > new.start_time
  ) then
    raise exception 'This time overlaps another time you have already published';
  end if;
  return new;
end $$;
create trigger availability_guard_trg before insert or update on availability
  for each row execute function availability_guard();

-- Saves one offering and ALL of its windows in a single transaction (runs under the caller's RLS).
create or replace function save_offering(
  p_offering_id uuid, p_kind text, p_label text, p_slot_minutes integer,
  p_rate_session numeric, p_rate_month numeric, p_windows jsonb
) returns uuid language plpgsql as $$
declare v_pid uuid; v_id uuid; w jsonb;
begin
  select id into v_pid from providers where user_id = auth.uid();
  if v_pid is null then raise exception 'No registration found'; end if;
  if jsonb_typeof(p_windows) <> 'array' or jsonb_array_length(p_windows) = 0 then
    raise exception 'Add at least one time window';
  end if;

  v_id := p_offering_id;
  if v_id is null and p_kind <> 'yoga_group' then
    select id into v_id from offerings where provider_id = v_pid and kind = p_kind::offering_kind;
  end if;

  if v_id is null then
    insert into offerings (provider_id, kind, label, slot_minutes, rate_per_session, rate_per_month)
    values (v_pid, p_kind::offering_kind, nullif(btrim(p_label), ''), p_slot_minutes, p_rate_session, p_rate_month)
    returning id into v_id;
  else
    update offerings set label = nullif(btrim(p_label), ''), slot_minutes = p_slot_minutes,
           rate_per_session = p_rate_session, rate_per_month = p_rate_month
    where id = v_id and provider_id = v_pid
    returning id into v_id;
    if v_id is null then raise exception 'Offering not found'; end if;
    delete from availability where offering_id = v_id;
  end if;

  for w in select * from jsonb_array_elements(p_windows) loop
    insert into availability (offering_id, weekday, start_time, end_time)
    values (v_id, (w->>'weekday')::smallint, (w->>'start')::time, (w->>'end')::time);
  end loop;
  return v_id;
end $$;

-- ---------- ROW LEVEL SECURITY ----------
alter table admins       enable row level security;
alter table providers    enable row level security;
alter table offerings    enable row level security;
alter table availability enable row level security;

create policy admins_self on admins for select using (user_id = auth.uid());

create policy providers_select on providers for select
  using (user_id = auth.uid() or is_admin_for(provider_type));
create policy providers_insert on providers for insert
  with check (user_id = auth.uid());
create policy providers_update on providers for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- (admins change status only through review_provider())

create policy offerings_select on offerings for select using (
  exists (select 1 from providers p where p.id = provider_id
          and (p.user_id = auth.uid() or is_admin_for(p.provider_type))));
create policy offerings_write on offerings for all
  using      (exists (select 1 from providers p where p.id = provider_id and p.user_id = auth.uid()))
  with check (exists (select 1 from providers p where p.id = provider_id and p.user_id = auth.uid()));

create policy availability_select on availability for select using (
  exists (select 1 from offerings o join providers p on p.id = o.provider_id
          where o.id = offering_id and (p.user_id = auth.uid() or is_admin_for(p.provider_type))));
create policy availability_write on availability for all
  using      (exists (select 1 from offerings o join providers p on p.id = o.provider_id
                      where o.id = offering_id and p.user_id = auth.uid()))
  with check (exists (select 1 from offerings o join providers p on p.id = o.provider_id
                      where o.id = offering_id and p.user_id = auth.uid()));

-- ---------- CERTIFICATE FILES (private bucket) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('certificates', 'certificates', false, 5242880,
        array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = false, file_size_limit = 5242880,
      allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png'];

-- files live in a folder named after the owner's user id: <user_id>/<file>
create policy cert_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'certificates' and (storage.foldername(name))[1] = auth.uid()::text);
create policy cert_delete on storage.objects for delete to authenticated
  using (bucket_id = 'certificates' and (storage.foldername(name))[1] = auth.uid()::text);
create policy cert_select on storage.objects for select to authenticated
  using (bucket_id = 'certificates' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from providers p
               where p.user_id::text = (storage.foldername(name))[1]
                 and is_admin_for(p.provider_type))));

-- ---------- CREATE THE TWO ADMINS (do this AFTER creating their users, see README) ----------
-- insert into admins (user_id, username, scope)
-- select id, 'yoga_admin', 'yoga' from auth.users where email = 'yoga_admin@admin.breathingpoint.in';
-- insert into admins (user_id, username, scope)
-- select id, 'phy_admin', 'physio' from auth.users where email = 'phy_admin@admin.breathingpoint.in';
