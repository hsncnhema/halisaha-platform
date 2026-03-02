create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  ad text,
  tip text not null default 'futbolcu' check (tip in ('futbolcu', 'saha', 'admin')),
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.futbolcular (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  mevki text,
  seviye text,
  baskin_ayak text,
  ilce text,
  il text,
  yas_araligi text,
  bio text,
  profil_tamamlandi boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.sahalar (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id) on delete cascade,
  saha_adi text not null,
  telefon text not null,
  il text,
  ilce text,
  lat double precision,
  lng double precision,
  format text,
  fiyat integer,
  slot_suresi integer,
  acilis_saati text,
  kapanis_saati text,
  durum text not null default 'beklemede' check (durum in ('beklemede', 'aktif', 'pasif')),
  kurallar text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.musaitlik (
  id bigserial primary key,
  saha_id uuid not null references public.sahalar(id) on delete cascade,
  tarih date not null,
  slot text not null,
  durum text not null default 'bos' check (durum in ('bos', 'dolu')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (saha_id, tarih, slot)
);

create table if not exists public.ilanlar (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kategori text not null,
  ilce text not null,
  il text,
  baslik text not null,
  aciklama text not null,
  tarih date,
  saat text,
  silinme_zamani timestamptz not null default (timezone('utc', now()) + interval '24 hours'),
  olusturulma timestamptz not null default timezone('utc', now())
);

create table if not exists public.turnuvalar (
  id uuid primary key default gen_random_uuid(),
  saha_id uuid not null references public.sahalar(id) on delete cascade,
  baslik text not null,
  format text,
  tarih date not null,
  katilim_ucreti integer,
  max_takim integer,
  durum text,
  odul text,
  olusturulma timestamptz not null default timezone('utc', now())
);

create table if not exists public.turnuva_katilimlar (
  id uuid primary key default gen_random_uuid(),
  turnuva_id uuid not null references public.turnuvalar(id) on delete cascade,
  takim_adi text not null,
  kaptan_id uuid not null references public.profiles(id) on delete cascade,
  olusturulma timestamptz not null default timezone('utc', now()),
  unique (turnuva_id, takim_adi)
);

drop trigger if exists futbolcular_set_updated_at on public.futbolcular;
create trigger futbolcular_set_updated_at
before update on public.futbolcular
for each row execute function public.set_updated_at();

drop trigger if exists sahalar_set_updated_at on public.sahalar;
create trigger sahalar_set_updated_at
before update on public.sahalar
for each row execute function public.set_updated_at();

drop trigger if exists musaitlik_set_updated_at on public.musaitlik;
create trigger musaitlik_set_updated_at
before update on public.musaitlik
for each row execute function public.set_updated_at();

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid and p.tip = 'admin'
  );
$$;

grant execute on function public.is_admin(uuid) to anon, authenticated, service_role;

create index if not exists idx_profiles_tip on public.profiles (tip);
create index if not exists idx_futbolcular_user_id on public.futbolcular (user_id);
create index if not exists idx_sahalar_durum on public.sahalar (durum);
create index if not exists idx_sahalar_il_ilce on public.sahalar (il, ilce);
create index if not exists idx_musaitlik_saha_tarih on public.musaitlik (saha_id, tarih);
create index if not exists idx_ilanlar_silinme_zamani on public.ilanlar (silinme_zamani);
create index if not exists idx_ilanlar_user_id on public.ilanlar (user_id);
create index if not exists idx_turnuvalar_saha_id on public.turnuvalar (saha_id);
create index if not exists idx_turnuva_katilimlar_turnuva_id on public.turnuva_katilimlar (turnuva_id);

alter table public.profiles enable row level security;
alter table public.futbolcular enable row level security;
alter table public.sahalar enable row level security;
alter table public.musaitlik enable row level security;
alter table public.ilanlar enable row level security;
alter table public.turnuvalar enable row level security;
alter table public.turnuva_katilimlar enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select
using (id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "profiles_insert_own_or_admin" on public.profiles;
create policy "profiles_insert_own_or_admin"
on public.profiles for insert
with check (id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles for update
using (id = auth.uid() or public.is_admin(auth.uid()))
with check (id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin"
on public.profiles for delete
using (public.is_admin(auth.uid()));

drop policy if exists "futbolcular_select_own_or_admin" on public.futbolcular;
create policy "futbolcular_select_own_or_admin"
on public.futbolcular for select
using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "futbolcular_insert_own_or_admin" on public.futbolcular;
create policy "futbolcular_insert_own_or_admin"
on public.futbolcular for insert
with check (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "futbolcular_update_own_or_admin" on public.futbolcular;
create policy "futbolcular_update_own_or_admin"
on public.futbolcular for update
using (user_id = auth.uid() or public.is_admin(auth.uid()))
with check (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "futbolcular_delete_admin" on public.futbolcular;
create policy "futbolcular_delete_admin"
on public.futbolcular for delete
using (public.is_admin(auth.uid()));

drop policy if exists "sahalar_select_public_or_owner_or_admin" on public.sahalar;
create policy "sahalar_select_public_or_owner_or_admin"
on public.sahalar for select
using (durum = 'aktif' or user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "sahalar_insert_own_or_admin" on public.sahalar;
create policy "sahalar_insert_own_or_admin"
on public.sahalar for insert
with check (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "sahalar_update_own_or_admin" on public.sahalar;
create policy "sahalar_update_own_or_admin"
on public.sahalar for update
using (user_id = auth.uid() or public.is_admin(auth.uid()))
with check (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "sahalar_delete_admin" on public.sahalar;
create policy "sahalar_delete_admin"
on public.sahalar for delete
using (public.is_admin(auth.uid()));

drop policy if exists "musaitlik_select_public_owner_admin" on public.musaitlik;
create policy "musaitlik_select_public_owner_admin"
on public.musaitlik for select
using (
  exists (
    select 1
    from public.sahalar s
    where s.id = musaitlik.saha_id
      and (s.durum = 'aktif' or s.user_id = auth.uid() or public.is_admin(auth.uid()))
  )
);

drop policy if exists "musaitlik_insert_owner_or_admin" on public.musaitlik;
create policy "musaitlik_insert_owner_or_admin"
on public.musaitlik for insert
with check (
  exists (
    select 1
    from public.sahalar s
    where s.id = musaitlik.saha_id
      and (s.user_id = auth.uid() or public.is_admin(auth.uid()))
  )
);

drop policy if exists "musaitlik_update_owner_or_admin" on public.musaitlik;
create policy "musaitlik_update_owner_or_admin"
on public.musaitlik for update
using (
  exists (
    select 1
    from public.sahalar s
    where s.id = musaitlik.saha_id
      and (s.user_id = auth.uid() or public.is_admin(auth.uid()))
  )
)
with check (
  exists (
    select 1
    from public.sahalar s
    where s.id = musaitlik.saha_id
      and (s.user_id = auth.uid() or public.is_admin(auth.uid()))
  )
);

drop policy if exists "musaitlik_delete_owner_or_admin" on public.musaitlik;
create policy "musaitlik_delete_owner_or_admin"
on public.musaitlik for delete
using (
  exists (
    select 1
    from public.sahalar s
    where s.id = musaitlik.saha_id
      and (s.user_id = auth.uid() or public.is_admin(auth.uid()))
  )
);

drop policy if exists "ilanlar_select_public" on public.ilanlar;
create policy "ilanlar_select_public"
on public.ilanlar for select
using (true);

drop policy if exists "ilanlar_insert_owner_or_admin" on public.ilanlar;
create policy "ilanlar_insert_owner_or_admin"
on public.ilanlar for insert
with check (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "ilanlar_update_owner_or_admin" on public.ilanlar;
create policy "ilanlar_update_owner_or_admin"
on public.ilanlar for update
using (user_id = auth.uid() or public.is_admin(auth.uid()))
with check (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "ilanlar_delete_owner_or_admin" on public.ilanlar;
create policy "ilanlar_delete_owner_or_admin"
on public.ilanlar for delete
using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "turnuvalar_select_public" on public.turnuvalar;
create policy "turnuvalar_select_public"
on public.turnuvalar for select
using (true);

drop policy if exists "turnuvalar_insert_owner_or_admin" on public.turnuvalar;
create policy "turnuvalar_insert_owner_or_admin"
on public.turnuvalar for insert
with check (
  exists (
    select 1
    from public.sahalar s
    where s.id = turnuvalar.saha_id
      and (s.user_id = auth.uid() or public.is_admin(auth.uid()))
  )
);

drop policy if exists "turnuvalar_update_owner_or_admin" on public.turnuvalar;
create policy "turnuvalar_update_owner_or_admin"
on public.turnuvalar for update
using (
  exists (
    select 1
    from public.sahalar s
    where s.id = turnuvalar.saha_id
      and (s.user_id = auth.uid() or public.is_admin(auth.uid()))
  )
)
with check (
  exists (
    select 1
    from public.sahalar s
    where s.id = turnuvalar.saha_id
      and (s.user_id = auth.uid() or public.is_admin(auth.uid()))
  )
);

drop policy if exists "turnuvalar_delete_owner_or_admin" on public.turnuvalar;
create policy "turnuvalar_delete_owner_or_admin"
on public.turnuvalar for delete
using (
  exists (
    select 1
    from public.sahalar s
    where s.id = turnuvalar.saha_id
      and (s.user_id = auth.uid() or public.is_admin(auth.uid()))
  )
);

drop policy if exists "turnuva_katilimlar_select_public" on public.turnuva_katilimlar;
create policy "turnuva_katilimlar_select_public"
on public.turnuva_katilimlar for select
using (true);

drop policy if exists "turnuva_katilimlar_insert_owner_or_admin" on public.turnuva_katilimlar;
create policy "turnuva_katilimlar_insert_owner_or_admin"
on public.turnuva_katilimlar for insert
with check (
  kaptan_id = auth.uid() or public.is_admin(auth.uid())
);

drop policy if exists "turnuva_katilimlar_update_owner_or_admin" on public.turnuva_katilimlar;
create policy "turnuva_katilimlar_update_owner_or_admin"
on public.turnuva_katilimlar for update
using (
  kaptan_id = auth.uid()
  or public.is_admin(auth.uid())
  or exists (
    select 1
    from public.turnuvalar t
    join public.sahalar s on s.id = t.saha_id
    where t.id = turnuva_katilimlar.turnuva_id
      and s.user_id = auth.uid()
  )
)
with check (
  kaptan_id = auth.uid()
  or public.is_admin(auth.uid())
  or exists (
    select 1
    from public.turnuvalar t
    join public.sahalar s on s.id = t.saha_id
    where t.id = turnuva_katilimlar.turnuva_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "turnuva_katilimlar_delete_owner_or_admin" on public.turnuva_katilimlar;
create policy "turnuva_katilimlar_delete_owner_or_admin"
on public.turnuva_katilimlar for delete
using (
  kaptan_id = auth.uid()
  or public.is_admin(auth.uid())
  or exists (
    select 1
    from public.turnuvalar t
    join public.sahalar s on s.id = t.saha_id
    where t.id = turnuva_katilimlar.turnuva_id
      and s.user_id = auth.uid()
  )
);
