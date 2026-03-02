alter table public.profiles enable row level security;
alter table public.futbolcular enable row level security;

insert into public.profiles (id, ad, email, tip)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', u.email),
  u.email,
  'futbolcu'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "futbolcular_insert_own" on public.futbolcular;
create policy "futbolcular_insert_own"
on public.futbolcular for insert
with check (auth.uid() = user_id);

drop policy if exists "futbolcular_update_own" on public.futbolcular;
create policy "futbolcular_update_own"
on public.futbolcular for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
