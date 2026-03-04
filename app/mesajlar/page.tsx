'use client';

import { supabase } from '@/lib/supabase';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { User } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type Mesaj = {
    id: string;
    gonderen_id: string;
    alici_id: string;
    icerik: string;
    okundu: boolean;
    created_at: string;
};

type SohbetPartneri = {
    id: string;
    ad: string | null;
    avatar_url: string | null;
    sonMesaj: string;
    sonMesajTarihi: string;
    okunmamisVarMi: boolean;
};

type Istek = {
    id: string;
    alici_id: string;
    gonderen_id: string;
    durum: string;
    profiles: {
        id: string;
        ad: string;
    };
};

export default function MesajlarPage() {
    const [kullanici, setKullanici] = useState<User | null>(null);
    const [sohbetler, setSohbetler] = useState<SohbetPartneri[]>([]);
    const [seciliPartner, setSeciliPartner] = useState<SohbetPartneri | null>(null);
    const [mesajlar, setMesajlar] = useState<Mesaj[]>([]);
    const [mesajInput, setMesajInput] = useState('');
    const [yukleniyor, setYukleniyor] = useState(true);
    const [mobilListeAcik, setMobilListeAcik] = useState(true);
    const [istekler, setIstekler] = useState<Istek[]>([]);
    const [aktifSekme, setAktifSekme] = useState<'mesajlar' | 'istekler'>('mesajlar');
    const mesajlarEndRef = useRef<HTMLDivElement>(null);

    // Oturum ve Sohbet Listesi Getirme
    useEffect(() => {
        const oturumAc = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setKullanici(user);
                await Promise.all([
                    sohbetListesiCek(user.id),
                    istekleriCek(user.id)
                ]);
            }
            setYukleniyor(false);
        };
        oturumAc();
    }, []);

    const istekleriCek = async (userId: string) => {
        const { data } = await supabase
            .from('arkadasliklar')
            .select(`
                id, alici_id, gonderen_id, durum,
                profiles!gonderen_id(id, ad)
            `)
            .eq('alici_id', userId)
            .eq('durum', 'beklemede');

        if (data) {
            setIstekler(data as any[]);
        }
    };

    const kabulEt = async (arkadaslikId: string) => {
        const { error } = await supabase
            .from('arkadasliklar')
            .update({ durum: 'kabul' })
            .eq('id', arkadaslikId);

        if (error) {
            console.error('Kabul hatası:', error);
            return;
        }

        setIstekler(prev =>
            prev.filter(i => i.id !== arkadaslikId)
        );
    };

    const reddEt = async (arkadaslikId: string) => {
        const { error } = await supabase
            .from('arkadasliklar')
            .update({ durum: 'reddedildi' })
            .eq('id', arkadaslikId);

        if (error) {
            console.error('Reddet hatası:', error);
            return;
        }

        setIstekler(prev =>
            prev.filter(i => i.id !== arkadaslikId)
        );
    };

    // Sohbet Listesini Supabase'den Çekme İşlemi (Custom)
    const sohbetListesiCek = async (userId: string) => {
        const { data, error } = await supabase
            .from('mesajlar')
            .select(`
                id, icerik, okundu, created_at, gonderen_id, alici_id,
                gonderen:profiles!gonderen_id(id, ad, avatar_url),
                alici:profiles!alici_id(id, ad, avatar_url)
            `)
            .or(`gonderen_id.eq.${userId},alici_id.eq.${userId}`)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Sohbetler çekilemedi:', error);
            return;
        }

        const sohbetMap = new Map<string, SohbetPartneri>();
        for (const m of data || []) {
            const isGonderen = m.gonderen_id === userId;
            const partnerId = isGonderen ? m.alici_id : m.gonderen_id;
            const partnerProfil = isGonderen ? m.alici : m.gonderen;

            // @ts-ignore
            const partner = Array.isArray(partnerProfil) ? partnerProfil[0] : partnerProfil;

            if (!sohbetMap.has(partnerId)) {
                sohbetMap.set(partnerId, {
                    id: partnerId,
                    ad: partner?.ad || 'Bilinmeyen Kullanıcı',
                    avatar_url: partner?.avatar_url || null,
                    sonMesaj: m.icerik,
                    sonMesajTarihi: m.created_at,
                    okunmamisVarMi: !isGonderen && !m.okundu,
                });
            }
        }

        setSohbetler(Array.from(sohbetMap.values()));
    };

    // Seçili Partnerin Mesajlarını Çekme
    useEffect(() => {
        if (!kullanici || !seciliPartner) return;

        const seciliMesajlariCek = async () => {
            const { data, error } = await supabase
                .from('mesajlar')
                .select('*')
                .or(`and(gonderen_id.eq.${kullanici.id},alici_id.eq.${seciliPartner.id}),and(gonderen_id.eq.${seciliPartner.id},alici_id.eq.${kullanici.id})`)
                .order('created_at', { ascending: true });

            if (error) {
                console.error("Mesajlar çekilemedi:", error);
            } else {
                setMesajlar(data as Mesaj[]);

                // Okunmamış olanları okundu işaretle
                const okunmamislar = data.filter((m: any) => m.alici_id === kullanici.id && !m.okundu);
                if (okunmamislar.length > 0) {
                    await supabase
                        .from('mesajlar')
                        .update({ okundu: true })
                        .in('id', okunmamislar.map((m: any) => m.id));

                    sohbetListesiCek(kullanici.id); // listeyi güncelle (yeşil noktayı kaldırmak için)
                }
            }
        };

        seciliMesajlariCek();
    }, [seciliPartner, kullanici]);

    // Realtime Mesaj Dinleyici
    useEffect(() => {
        if (!kullanici) return;

        const channel = supabase
            .channel('mesajlar-changes')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'mesajlar',
                filter: `alici_id=eq.${kullanici.id}` // Sadece bana gelenler
            }, (payload: any) => {
                const yeniMesaj = payload.new as Mesaj;

                if (seciliPartner && (yeniMesaj.gonderen_id === seciliPartner.id)) {
                    // Açık sohbetteysek mesaja ekle
                    setMesajlar(prev => [...prev, yeniMesaj]);
                    // Ve okundu olarak isaretle
                    supabase.from('mesajlar').update({ okundu: true }).eq('id', yeniMesaj.id).then();
                } else {
                    // Farklı sohbetteyse sadece listeyi güncelle
                    sohbetListesiCek(kullanici.id);
                }
            })
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'mesajlar',
                filter: `gonderen_id=eq.${kullanici.id}` // Benim gönderdiklerim (Sekme senkronizasyonu)
            }, (payload: any) => {
                const yeniMesaj = payload.new as Mesaj;
                if (seciliPartner && (yeniMesaj.alici_id === seciliPartner.id)) {
                    // Gönderilen mesajı aynı anda arayüze eklemeyi önlemek için ID check yapabiliriz
                    // Fakat form submit anında optimistic UI update yapmıyorsak direkt ekleyebiliriz
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [kullanici, seciliPartner]);

    // Mesajlar eklendikçe en alta kaydır
    useEffect(() => {
        mesajlarEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [mesajlar]);

    const mesajGonder = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!mesajInput.trim() || !kullanici || !seciliPartner) return;

        const gonderilecekIcerik = mesajInput;
        setMesajInput('');

        // Optimistic UI update
        const geciciMesaj: Mesaj = {
            id: Date.now().toString(),
            gonderen_id: kullanici.id,
            alici_id: seciliPartner.id,
            icerik: gonderilecekIcerik,
            okundu: false,
            created_at: new Date().toISOString()
        };
        setMesajlar(prev => [...prev, geciciMesaj]);

        const { error } = await supabase
            .from('mesajlar')
            .insert({
                gonderen_id: kullanici.id,
                alici_id: seciliPartner.id,
                icerik: gonderilecekIcerik
            });

        if (error) {
            console.error('Mesaj gönderilemedi:', error);
            // Hata durumunda mesajı listeden geri silebilirsiniz
        } else {
            sohbetListesiCek(kullanici.id);
        }
    };

    if (yukleniyor) {
        return <div className="min-h-screen bg-green-950 flex items-center justify-center text-white/50">Yükleniyor...</div>;
    }

    if (!kullanici) {
        return (
            <div className="min-h-screen bg-green-950 flex items-center justify-center">
                <div className="text-center text-white">
                    <p className="mb-4 text-white/60">Mesajlaşmak için giriş yapmalısınız.</p>
                    <Link href="/login" className="text-green-400 hover:underline">Giriş Yap</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-green-950 font-sans">
            {/* SOL KOLON - SOHBET LİSTESİ */}
            <div className={`w-full md:w-80 flex flex-col border-r border-white/10 ${mobilListeAcik ? 'flex' : 'hidden md:flex'}`}>
                {/* Sol Kolon Header (Sekmeler) */}
                <div className="shrink-0 border-b border-white/10">
                    <div className="flex bg-white/5">
                        <button
                            onClick={() => setAktifSekme('mesajlar')}
                            className={`flex-1 py-4 text-sm text-center transition tracking-wide ${aktifSekme === 'mesajlar'
                                    ? 'border-b-2 border-green-400 text-white font-bold'
                                    : 'text-white/40 hover:text-white'
                                }`}
                        >
                            Mesajlar
                        </button>
                        <button
                            onClick={() => setAktifSekme('istekler')}
                            className={`flex-1 py-4 text-sm text-center flex items-center justify-center gap-2 transition tracking-wide ${aktifSekme === 'istekler'
                                    ? 'border-b-2 border-green-400 text-white font-bold'
                                    : 'text-white/40 hover:text-white'
                                }`}
                        >
                            İstekler
                            {istekler.length > 0 && (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                                    {istekler.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {aktifSekme === 'istekler' ? (
                        <>
                            {istekler.length > 0 ? (
                                <div className="pb-2">
                                    {istekler.map((istek) => (
                                        <div key={istek.id} className="flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 transition">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="flex shrink-0 h-10 w-10 items-center justify-center rounded-full bg-green-600 text-sm font-black text-white">
                                                    {istek.profiles?.ad ? istek.profiles.ad.charAt(0).toLocaleUpperCase('tr-TR') : '?'}
                                                </div>
                                                <div className="truncate">
                                                    <p className="text-sm font-bold text-white truncate">{istek.profiles?.ad}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    onClick={() => kabulEt(istek.id)}
                                                    className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center text-white hover:bg-green-500 transition"
                                                    title="Kabul Et"
                                                >
                                                    ✓
                                                </button>
                                                <button
                                                    onClick={() => reddEt(istek.id)}
                                                    className="h-8 w-8 rounded-full bg-red-600/30 text-red-400 flex items-center justify-center hover:bg-red-600/50 transition"
                                                    title="Reddet"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="p-6 text-center text-sm text-white/40">Bekleyen arkadaşlık isteğiniz bulunmuyor.</p>
                            )}
                        </>
                    ) : (
                        <>
                            {sohbetler.length === 0 ? (
                                <p className="p-6 text-center text-sm text-white/40">Henüz bir mesajınız yok.</p>
                            ) : (
                                sohbetler.map(partner => (
                                    <button
                                        key={partner.id}
                                        onClick={() => {
                                            setSeciliPartner(partner);
                                            setMobilListeAcik(false); // Mobilde listeyi gizle, sohbeti aç
                                        }}
                                        className={`w-full flex items-center gap-3 p-4 border-b border-white/5 transition hover:bg-white/5 text-left
                                            ${seciliPartner?.id === partner.id ? 'bg-green-900/50' : ''}`}
                                    >
                                        <div className="flex shrink-0 h-10 w-10 items-center justify-center rounded-full bg-green-600 text-sm font-black text-white relative">
                                            {partner.ad ? partner.ad.charAt(0).toLocaleUpperCase('tr-TR') : '?'}
                                            {partner.okunmamisVarMi && (
                                                <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-green-400 border-2 border-green-950"></span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-white text-sm truncate">{partner.ad}</h3>
                                            <p className="text-xs text-white/40 truncate">{partner.sonMesaj}</p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* SAĞ KOLON - AKTİF SOHBET ALANI */}
            <div className={`flex-1 flex-col ${!mobilListeAcik ? 'flex' : 'hidden md:flex'}`}>
                {!seciliPartner ? (
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-white/30">Bir sohbet seçin</p>
                    </div>
                ) : (
                    <>
                        {/* SOHBET HEADER */}
                        <div className="flex items-center gap-3 p-4 border-b border-white/10 shrink-0 bg-white/5">
                            <button
                                onClick={() => setMobilListeAcik(true)}
                                className="md:hidden text-green-400 hover:text-green-300 font-bold p-1 mr-1"
                            >
                                ←
                            </button>
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-sm font-black text-white">
                                {seciliPartner.ad ? seciliPartner.ad.charAt(0).toLocaleUpperCase('tr-TR') : '?'}
                            </div>
                            <h2 className="font-bold text-lg text-white">
                                <Link href={`/profil/${seciliPartner.id}`} className="hover:underline">
                                    {seciliPartner.ad}
                                </Link>
                            </h2>
                        </div>

                        {/* MESAJ LİSTESİ */}
                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                            {mesajlar.map(mesaj => {
                                const isBenim = mesaj.gonderen_id === kullanici.id;
                                return (
                                    <div key={mesaj.id} className={`flex ${isBenim ? 'justify-end' : 'justify-start'}`}>
                                        <div
                                            className={`max-w-[75%] px-4 py-2 text-sm text-white ${isBenim
                                                ? 'bg-green-600 rounded-2xl rounded-tr-sm'
                                                : 'bg-white/10 rounded-2xl rounded-tl-sm'
                                                }`}
                                        >
                                            {mesaj.icerik}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={mesajlarEndRef} />
                        </div>

                        {/* MESAJ YAZMA İNPUTU */}
                        <div className="p-4 border-t border-white/10 bg-green-950 shrink-0">
                            <form
                                onSubmit={mesajGonder}
                                className="flex items-end gap-2"
                            >
                                <textarea
                                    value={mesajInput}
                                    onChange={(e) => setMesajInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            mesajGonder();
                                        }
                                    }}
                                    placeholder="Mesaj yazın... (Göndermek için Enter'a basın)"
                                    className="flex-1 max-h-32 min-h-12 resize-y rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/30 px-4 py-3 text-sm focus:border-green-400 focus:outline-none"
                                    rows={1}
                                />
                                <button
                                    type="submit"
                                    disabled={!mesajInput.trim()}
                                    className="h-12 rounded-xl bg-green-600 px-6 font-bold text-white transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Gönder
                                </button>
                            </form>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
