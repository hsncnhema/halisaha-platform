'use client';

import { getIlanlar, supabase } from '@/lib/supabase';
import { ILCELER, ILLER } from '@/lib/turkiye';
import type { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const kategoriRenk: Record<string, string> = {
  'Oyuncu Arıyorum': 'bg-green-900/60 text-green-300',
  'Takım Arıyorum': 'bg-blue-900/60 text-blue-300',
  Duyuru: 'bg-white/10 text-white/50',
};

type IlanItem = Awaited<ReturnType<typeof getIlanlar>>[number];

export default function IlanlarPage() {
  const [ilanlar, setIlanlar] = useState<IlanItem[]>([]);
  const [kullanici, setKullanici] = useState<User | null>(null);
  const [kullaniciTip, setKullaniciTip] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [formAcik, setFormAcik] = useState(false);
  const [filtre, setFiltre] = useState({ kategori: '', il: '', ilce: '' });
  const [form, setForm] = useState({
    kategori: 'Oyuncu Arıyorum',
    il: '',
    ilce: '',
    baslik: '',
    aciklama: '',
    tarih: '',
    saat: '',
  });
  const [gonderiyor, setGonderiyor] = useState(false);
  const [error, setError] = useState('');

  const ilanlariYukle = async () => {
    try {
      const data = await getIlanlar();
      setIlanlar(data as IlanItem[]);
    } catch (err) {
      console.error(err);
    } finally {
      setYukleniyor(false);
    }
  };

  const kullaniciYukle = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setKullanici(user ?? null);
    if (!user) {
      setKullaniciTip(null);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tip')
      .eq('id', user.id)
      .maybeSingle();

    setKullaniciTip(profile?.tip ?? null);
  };

  useEffect(() => {
    ilanlariYukle();
    kullaniciYukle();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      kullaniciYukle();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('ilanlar-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ilanlar' }, () => {
        ilanlariYukle();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const ilanAc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kullanici) {
      setError('İlan açmak için giriş yap.');
      return;
    }
    if (!form.il || !form.ilce || !form.baslik || !form.aciklama) {
      setError('Tüm zorunlu alanları doldur.');
      return;
    }

    setGonderiyor(true);
    setError('');

    const { error: insertError } = await supabase.from('ilanlar').insert({
      user_id: kullanici.id,
      kategori: form.kategori,
      ilce: form.ilce,
      il: form.il,
      baslik: form.baslik,
      aciklama: form.aciklama,
      tarih: form.tarih || null,
      saat: form.saat || null,
      silinme_zamani: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    if (insertError) {
      setError('İlan açılamadı, tekrar dene.');
      setGonderiyor(false);
      return;
    }

    setFormAcik(false);
    setForm({ kategori: 'Oyuncu Arıyorum', il: '', ilce: '', baslik: '', aciklama: '', tarih: '', saat: '' });
    await ilanlariYukle();
    setGonderiyor(false);
  };

  const formIlceler = form.il ? ILCELER(form.il) : [];
  const filtreIlceler = filtre.il ? ILCELER(filtre.il) : [];

  const filtrelenmis = ilanlar.filter((i) => {
    if (filtre.kategori && i.kategori !== filtre.kategori) return false;
    if (filtre.il && i.il !== filtre.il) return false;
    if (filtre.ilce && i.ilce !== filtre.ilce) return false;
    return true;
  });

  const kalanSure = (silinmeZamani: string) => {
    const fark = new Date(silinmeZamani).getTime() - Date.now();
    const saat = Math.floor(fark / (1000 * 60 * 60));
    const dakika = Math.floor((fark % (1000 * 60 * 60)) / (1000 * 60));
    if (saat <= 0 && dakika <= 0) return 'Süresi doldu';
    if (saat <= 0) return `${dakika}dk kaldı`;
    return `${saat}sa ${dakika}dk kaldı`;
  };

  return (
    <div className="min-h-screen bg-green-950 mx-auto max-w-2xl px-4 pb-16 pt-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-green-400 hover:underline">
            ← Ana Sayfa
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-white">📋 İlan Panosu</h1>
        </div>
        {kullanici ? (
          <button
            onClick={() => setFormAcik(!formAcik)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              formAcik ? 'bg-white/10 text-white/60 hover:bg-white/20' : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {formAcik ? 'İptal' : '+ İlan Aç'}
          </button>
        ) : (
          <Link href="/login" className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-700">
            Giriş Yap
          </Link>
        )}
      </div>

      {formAcik && (
        <div className="mb-5 rounded-2xl border border-green-500/30 bg-white/5 p-5">
          <h3 className="mb-4 text-base font-bold text-white">Yeni İlan</h3>
          <form onSubmit={ilanAc} className="flex flex-col gap-3">
            <select
              value={form.kategori}
              onChange={(e) => setForm({ ...form, kategori: e.target.value })}
              className="bg-green-900 border border-white/20 text-white rounded-lg px-3 py-2"
            >
              <option value="Oyuncu Arıyorum">Oyuncu Arıyorum</option>
              <option value="Takım Arıyorum">Takım Arıyorum</option>
              {kullaniciTip === 'saha' && <option value="Duyuru">Duyuru</option>}
            </select>
            <select
              value={form.il}
              onChange={(e) => setForm({ ...form, il: e.target.value, ilce: '' })}
              className="bg-green-900 border border-white/20 text-white rounded-lg px-3 py-2"
            >
              <option value="">Il sec *</option>
              {ILLER.map((il) => (
                <option key={il} value={il}>
                  {il}
                </option>
              ))}
            </select>
            <select
              value={form.ilce}
              onChange={(e) => setForm({ ...form, ilce: e.target.value })}
              disabled={!form.il}
              className="bg-green-900 border border-white/20 text-white rounded-lg px-3 py-2"
            >
              <option value="">{form.il ? "Ilce sec *" : "Once il sec *"}</option>
              {formIlceler.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Başlık *"
              value={form.baslik}
              onChange={(e) => setForm({ ...form, baslik: e.target.value })}
              className="w-full rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-white/30 px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none"
            />
            <textarea
              placeholder="Açıklama * (format, seviye, iletişim bilgisi...)"
              value={form.aciklama}
              onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
              rows={3}
              className="w-full resize-y rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-white/30 px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={form.tarih}
                onChange={(e) => setForm({ ...form, tarih: e.target.value })}
                className="w-full rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-white/30 px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none"
              />
              <input
                type="time"
                value={form.saat}
                onChange={(e) => setForm({ ...form, saat: e.target.value })}
                className="w-full rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-white/30 px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none"
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={gonderiyor}
              className="w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white transition hover:bg-green-700 disabled:bg-white/10 disabled:text-white/30"
            >
              {gonderiyor ? 'Gönderiliyor...' : 'İlan Yayınla'}
            </button>
          </form>
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        <select
          value={filtre.kategori}
          onChange={(e) => setFiltre({ ...filtre, kategori: e.target.value })}
          className="bg-green-900 border border-white/20 text-white rounded-lg px-3 py-2"
        >
          <option value="">Tüm Kategoriler</option>
          <option value="Oyuncu Arıyorum">Oyuncu Arıyorum</option>
          <option value="Takım Arıyorum">Takım Arıyorum</option>
          <option value="Duyuru">Duyuru</option>
        </select>
        <select
          value={filtre.il}
          onChange={(e) => setFiltre({ ...filtre, il: e.target.value, ilce: '' })}
          className="bg-green-900 border border-white/20 text-white rounded-lg px-3 py-2"
        >
          <option value="">Tum Iller</option>
          {ILLER.map((il) => (
            <option key={il} value={il}>
              {il}
            </option>
          ))}
        </select>
        <select
          value={filtre.ilce}
          onChange={(e) => setFiltre({ ...filtre, ilce: e.target.value })}
          disabled={!filtre.il}
          className="bg-green-900 border border-white/20 text-white rounded-lg px-3 py-2"
        >
          <option value="">Tüm İlçeler</option>
          {filtreIlceler.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
        {(filtre.kategori || filtre.il || filtre.ilce) && (
          <button
            onClick={() => setFiltre({ kategori: '', il: '', ilce: '' })}
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20"
          >
            Temizle ✕
          </button>
        )}
      </div>

      {yukleniyor ? (
        <div className="py-16 text-center text-sm text-white/40">Yükleniyor...</div>
      ) : filtrelenmis.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 py-16 text-center">
          <p className="mb-3 text-4xl">📋</p>
          <p className="font-bold text-white">Henüz ilan yok</p>
          <p className="mt-1 text-sm text-white/40">İlk ilanı sen aç!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtrelenmis.map((ilan) => (
            <div key={ilan.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-green-500/40">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${kategoriRenk[ilan.kategori] || 'bg-slate-100 text-slate-600'}`}>
                    {ilan.kategori}
                  </span>
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white/50">
                    📍 {ilan.ilce}
                  </span>
                </div>
                <span className="shrink-0 text-xs text-white/30">⏱ {kalanSure(ilan.silinmeZamani)}</span>
              </div>
              <h3 className="mb-1 text-sm font-bold text-white">{ilan.baslik}</h3>
              <p className="mb-2 text-xs leading-relaxed text-white/40">{ilan.aciklama}</p>
              {(ilan.tarih || ilan.saat) && (
                <p className="text-xs font-semibold text-green-400">
                  🗓 {ilan.tarih} {ilan.saat}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
