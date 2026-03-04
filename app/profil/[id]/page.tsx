'use client';

import { supabase } from '@/lib/supabase';
import { useEffect, useState, use } from 'react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type ProfilData = {
    id: string;
    ad: string | null;
    il: string | null;
    ilce: string | null;
    tip: string | null;
    futbolcular?: {
        mevki: string | null;
        seviye: string | null;
    } | null;
};

export default function BaskaProfilPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [profil, setProfil] = useState<ProfilData | null>(null);
    const [arkadaslikDurumu, setArkadaslikDurumu] = useState<'yok' | 'istek_gonderildi' | 'arkadas'>('yok');
    // const [mevcutKullaniciId, setMevcutKullaniciId] = useState<string | null>(null);
    const [yukleniyor, setYukleniyor] = useState(true);

    useEffect(() => {
        const getir = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                const basvuranId = user?.id;
                // setMevcutKullaniciId(basvuranId || null);

                // Profil Bilgilerini Çek
                const { data: profilData, error: profilHata } = await supabase
                    .from('profiles')
                    .select('*, futbolcular(*)')
                    .eq('id', id)
                    .single();

                if (profilHata) throw profilHata;
                setProfil(profilData as ProfilData);

                // Arkadaşlık Durumu Kontrolü
                if (basvuranId && basvuranId !== id) {
                    const { data: arkadaslikData } = await supabase
                        .from('arkadaslik')
                        .select('*')
                        .or(`and(gonderen_id.eq.${basvuranId},alan_id.eq.${id}),and(gonderen_id.eq.${id},alan_id.eq.${basvuranId})`)
                        .maybeSingle();

                    if (arkadaslikData) {
                        if (arkadaslikData.durum === 'kabul_edildi') {
                            setArkadaslikDurumu('arkadas');
                        } else if (arkadaslikData.durum === 'bekliyor') {
                            setArkadaslikDurumu('istek_gonderildi');
                        }
                    }
                }
            } catch (err) {
                console.error('Profil getirilemedi:', err);
            } finally {
                setYukleniyor(false);
            }
        };
        getir();
    }, [id]);

    const arkadasEkle = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert("Arkadaş eklemek için giriş yapmalısınız.");
                return;
            }

            const { error } = await supabase
                .from('arkadaslik')
                .insert([{ gonderen_id: user.id, alan_id: id, durum: 'bekliyor' }]);

            if (error) throw error;
            setArkadaslikDurumu('istek_gonderildi');

        } catch (err: any) {
            console.error('Arkadaş ekleme hatası:', err);
            alert(err.message || "Arkadaş eklenirken bir hata oluştu.");
        }
    };

    if (yukleniyor) {
        return (
            <div className="min-h-screen bg-green-950 flex items-center justify-center">
                <p className="text-sm text-white/40">Yükleniyor...</p>
            </div>
        );
    }

    if (!profil) {
        return (
            <div className="min-h-screen bg-green-950 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-white/60 mb-4">Kullanıcı bulunamadı.</p>
                    <Link href="/ilanlar" className="text-green-400 hover:underline">
                        ← Geri dön
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl px-4 py-8">
            <Link href="/ilanlar" className="mb-6 inline-block text-sm text-white/50 hover:text-green-400">
                ← İlanlara dön
            </Link>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-600 text-4xl font-black text-white shadow-lg shadow-black/20">
                        {profil.ad ? profil.ad.charAt(0).toLocaleUpperCase('tr-TR') : '?'}
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                        <h1 className="text-2xl font-black text-white">{profil.ad || 'İsimsiz Kullanıcı'}</h1>
                        {profil.il && profil.ilce && (
                            <p className="mt-1 text-sm text-white/50">📍 {profil.ilce}, {profil.il}</p>
                        )}

                        <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-2">
                            {profil.tip && (
                                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/70">
                                    {profil.tip}
                                </span>
                            )}
                            {profil.futbolcular?.mevki && (
                                <span className="rounded-full border border-green-500/30 bg-green-500/20 px-3 py-1 text-xs text-green-300">
                                    Mevki: {profil.futbolcular.mevki}
                                </span>
                            )}
                            {profil.futbolcular?.seviye && (
                                <span className="rounded-full border border-blue-500/30 bg-blue-500/20 px-3 py-1 text-xs text-blue-300">
                                    Seviye: {profil.futbolcular.seviye}
                                </span>
                            )}
                        </div>

                        <div className="mt-6">
                            {arkadaslikDurumu === 'arkadas' && (
                                <button disabled className="rounded-xl border border-white/20 bg-white/10 px-6 py-2 text-sm font-bold text-white/70 cursor-not-allowed">
                                    ✓ Arkadaşsınız
                                </button>
                            )}
                            {arkadaslikDurumu === 'istek_gonderildi' && (
                                <button disabled className="rounded-xl border border-yellow-500/50 bg-yellow-500/20 px-6 py-2 text-sm font-bold text-yellow-500 cursor-not-allowed">
                                    Kabul Bekleniyor
                                </button>
                            )}
                            {arkadaslikDurumu === 'yok' && (
                                <button onClick={arkadasEkle} className="rounded-xl bg-green-600 px-6 py-2 text-sm font-bold text-white transition hover:bg-green-500">
                                    Arkadaş Ekle
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
