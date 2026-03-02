alter table public.sahalar
drop constraint if exists sahalar_durum_check;

alter table public.sahalar
add constraint sahalar_durum_check
check (durum in ('beklemede', 'aktif', 'pasif', 'reddedildi'));

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select
using (id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "sahalar_update_own_or_admin" on public.sahalar;
create policy "sahalar_update_own_or_admin"
on public.sahalar for update
using (
  public.is_admin(auth.uid())
  or user_id = auth.uid()
)
with check (
  public.is_admin(auth.uid())
  or (
    user_id = auth.uid()
    and exists (
      select 1
      from public.sahalar old_saha
      where old_saha.id = sahalar.id
        and old_saha.durum = sahalar.durum
    )
  )
);
