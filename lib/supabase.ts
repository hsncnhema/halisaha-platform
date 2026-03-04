import { createBrowserClient } from '@supabase/auth-helpers-nextjs';
import type { SupabaseClient, User } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

let _supabase: ReturnType<typeof createBrowserClient> | null = null;

function getSupabase() {
  if (!_supabase) {
    _supabase = createBrowserClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder', {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return _supabase;
}

export const supabase = typeof window !== 'undefined'
  ? getSupabase()
  : new Proxy({} as ReturnType<typeof createBrowserClient>, {
      get(_target, prop) {
        return getSupabase()[prop as keyof ReturnType<typeof createBrowserClient>];
      },
    });

type MusaitlikDurumu = 'bos' | 'dolu';

type SahaRow = {
  id: string;
  user_id: string | null;
  saha_adi: string;
  telefon: string;
  il: string | null;
  ilce: string | null;
  lat: number | null;
  lng: number | null;
  format: string | null;
  fiyat: number | null;
  slot_suresi: number | null;
  acilis_saati: string | null;
  kapanis_saati: string | null;
  durum: string;
  kurallar: string | null;
  created_at: string;
};

type IlanRow = {
  id: string;
  user_id: string;
  kategori: string;
  ilce: string;
  il: string | null;
  baslik: string;
  aciklama: string;
  tarih: string | null;
  saat: string | null;
  silinme_zamani: string;
  olusturulma: string;
};

type MusaitlikRow = {
  saha_id: string;
  tarih: string;
  slot: string;
  durum: MusaitlikDurumu;
};

const mapSaha = (row: SahaRow, musaitlik: Record<string, MusaitlikDurumu> = {}) => ({
  id: row.id,
  userId: row.user_id,
  user_id: row.user_id,
  sahaAdi: row.saha_adi,
  saha_adi: row.saha_adi,
  telefon: row.telefon,
  il: row.il,
  ilce: row.ilce,
  lat: row.lat,
  lng: row.lng,
  format: row.format,
  fiyat: row.fiyat,
  slotSuresi: row.slot_suresi,
  slot_suresi: row.slot_suresi,
  acilisSaati: row.acilis_saati,
  kapanisSaati: row.kapanis_saati,
  acilis_saati: row.acilis_saati,
  kapanis_saati: row.kapanis_saati,
  durum: row.durum,
  kurallar: row.kurallar,
  kurulumTamamlandi: Boolean(row.acilis_saati && row.kapanis_saati && row.slot_suresi),
  musaitlik,
  created_at: row.created_at,
  olusturulma: row.created_at,
});

const mapIlan = (row: IlanRow) => ({
  id: row.id,
  userId: row.user_id,
  user_id: row.user_id,
  kategori: row.kategori,
  ilce: row.ilce,
  il: row.il,
  baslik: row.baslik,
  aciklama: row.aciklama,
  tarih: row.tarih,
  saat: row.saat,
  silinmeZamani: row.silinme_zamani,
  silinme_zamani: row.silinme_zamani,
  olusturulma: row.olusturulma,
});

const bosMusaitlik = (): Record<string, MusaitlikDurumu> => ({});

async function musaitlikMapiGetir(sahaIdleri: string[]) {
  const musaitlikBySaha = new Map<string, Record<string, MusaitlikDurumu>>();
  if (sahaIdleri.length === 0) return musaitlikBySaha;

  const { data, error } = await supabase
    .from('musaitlik')
    .select('saha_id, tarih, slot, durum')
    .in('saha_id', sahaIdleri);

  if (error) throw error;

  for (const row of (data ?? []) as MusaitlikRow[]) {
    const mevcut = musaitlikBySaha.get(row.saha_id) ?? bosMusaitlik();
    mevcut[`${row.tarih}_${row.slot}`] = row.durum;
    musaitlikBySaha.set(row.saha_id, mevcut);
  }

  return musaitlikBySaha;
}

export async function getSahalar() {
  const { data, error } = await supabase
    .from('sahalar')
    .select('*')
    .eq('durum', 'aktif')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const sahaRows = (data ?? []) as SahaRow[];
  const musaitlikBySaha = await musaitlikMapiGetir(sahaRows.map((s) => s.id));

  return sahaRows.map((row) => mapSaha(row, musaitlikBySaha.get(row.id) ?? bosMusaitlik()));
}

export async function getSahaById(id: string) {
  const { data: sahaData, error: sahaError } = await supabase
    .from('sahalar')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (sahaError) throw sahaError;
  if (!sahaData) return null;

  const { data: musaitlikData, error: musaitlikError } = await supabase
    .from('musaitlik')
    .select('saha_id, tarih, slot, durum')
    .eq('saha_id', id);

  if (musaitlikError) throw musaitlikError;

  const musaitlik = bosMusaitlik();
  for (const row of (musaitlikData ?? []) as MusaitlikRow[]) {
    musaitlik[`${row.tarih}_${row.slot}`] = row.durum;
  }

  return mapSaha(sahaData as SahaRow, musaitlik);
}

export async function getIlanlar(limitCount = 200) {
  const simdi = new Date().toISOString();
  const tabanSorgu = supabase
    .from('ilanlar')
    .select('*')
    .gt('silinme_zamani', simdi)
    .order('silinme_zamani', { ascending: false });

  const { data, error } = limitCount > 0 ? await tabanSorgu.limit(limitCount) : await tabanSorgu;

  if (error) throw error;
  return ((data ?? []) as IlanRow[]).map(mapIlan);
}

function varsayilanAd(user: User) {
  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Kullanıcı'
  );
}

async function varsayilanFutbolcuKaydiOlustur(user: User) {
  await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        ad: varsayilanAd(user),
        tip: 'futbolcu',
        avatar_url: user.user_metadata?.avatar_url ?? null,
      },
      { onConflict: 'id' }
    );

  await supabase
    .from('futbolcular')
    .upsert(
      {
        user_id: user.id,
        profil_tamamlandi: false,
      },
      { onConflict: 'user_id' }
    );
}

export async function yonlendirmeYoluGetir(client: SupabaseClient, userId: string) {
  const { data: profile } = await client
    .from('profiles')
    .select('tip')
    .eq('id', userId)
    .maybeSingle();

  if (!profile) return '/profil-tamamla';

  if (profile.tip === 'admin') return '/admin';

  if (profile.tip === 'futbolcu') return '/profil';

  if (profile.tip === 'saha') return '/halisaha/panel';

  return '/';
}

export async function kullaniciyiYonlendir(user: User | null) {
  if (!user) return '/login';

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    await varsayilanFutbolcuKaydiOlustur(user);
    return '/profil-tamamla';
  }

  return yonlendirmeYoluGetir(supabase, user.id);
}

export async function arkadaslikIstegiGonder(alici_id: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Giriş yapılmamış');

  const { data, error } = await supabase
    .from('arkadasliklar')
    .insert({ gonderen_id: user.id, alici_id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function arkadasliklariGetir(user_id: string) {
  const { data, error } = await supabase
    .from('arkadasliklar')
    .select(`
      id, durum, created_at,
      gonderen:profiles!gonderen_id(id, ad, avatar_url),
      alici:profiles!alici_id(id, ad, avatar_url)
    `)
    .or(`gonderen_id.eq.${user_id},alici_id.eq.${user_id}`);

  if (error) throw error;
  return data ?? [];
}

export async function arkadaslikKabul(arkadaslik_id: string) {
  const { data, error } = await supabase
    .from('arkadasliklar')
    .update({ durum: 'kabul' })
    .eq('id', arkadaslik_id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function arkadaslikReddet(arkadaslik_id: string) {
  const { data, error } = await supabase
    .from('arkadasliklar')
    .update({ durum: 'reddedildi' })
    .eq('id', arkadaslik_id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function arkadasMi(user_id: string, diger_id: string) {
  const { data, error } = await supabase
    .from('arkadasliklar')
    .select('id, durum')
    .or(
      `and(gonderen_id.eq.${user_id},alici_id.eq.${diger_id}),and(gonderen_id.eq.${diger_id},alici_id.eq.${user_id})`
    )
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function mesajGonder(alici_id: string, icerik: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Giriş yapılmamış');

  const { data, error } = await supabase
    .from('mesajlar')
    .insert({ gonderen_id: user.id, alici_id, icerik })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function mesajlariGetir(diger_id: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Giriş yapılmamış');

  const { data, error } = await supabase
    .from('mesajlar')
    .select('*')
    .or(
      `and(gonderen_id.eq.${user.id},alici_id.eq.${diger_id}),and(gonderen_id.eq.${diger_id},alici_id.eq.${user.id})`
    )
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function sohbetleriGetir(user_id: string) {
  const { data, error } = await supabase
    .from('mesajlar')
    .select(`
      id, icerik, okundu, created_at, gonderen_id, alici_id,
      gonderen:profiles!gonderen_id(id, ad, avatar_url),
      alici:profiles!alici_id(id, ad, avatar_url)
    `)
    .or(`gonderen_id.eq.${user_id},alici_id.eq.${user_id}`)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Her konuşma partneri için yalnızca son mesajı tut
  const sohbetMap = new Map<string, typeof data[0]>();
  for (const mesaj of data ?? []) {
    const partner_id = mesaj.gonderen_id === user_id ? mesaj.alici_id : mesaj.gonderen_id;
    if (!sohbetMap.has(partner_id)) {
      sohbetMap.set(partner_id, mesaj);
    }
  }

  return Array.from(sohbetMap.values());
}

export async function mesajOkunduIsaretle(mesaj_id: string) {
  const { data, error } = await supabase
    .from('mesajlar')
    .update({ okundu: true })
    .eq('id', mesaj_id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createServerSupabaseClient() {
  const [{ createServerClient }, { cookies }] = await Promise.all([
    import('@supabase/auth-helpers-nextjs'),
    import('next/headers'),
  ]);
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll().map((c) => ({ name: c.name, value: c.value })),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

export async function createRouteSupabaseClient() {
  const [{ createServerClient }, { cookies }] = await Promise.all([
    import('@supabase/auth-helpers-nextjs'),
    import('next/headers'),
  ]);
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll().map((c) => ({ name: c.name, value: c.value })),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}
