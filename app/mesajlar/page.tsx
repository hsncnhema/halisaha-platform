'use client';

import { supabase } from '@/lib/supabase';
import { useEffect, useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { Plus, Search, X, Trash2 } from 'lucide-react';

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
    partner_id: string;
    ad: string | null;
    avatar_url: string | null;
    sonMesaj: string;
    sonMesajTarihi: string;
    okunmamisVarMi: boolean;
    okunmamisSayisi?: number;
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

function MesajlarIcerik() {
    const searchParams = useSearchParams();
    const kisiId = searchParams.get('kisi');
    const [kullanici, setKullanici] = useState<User | null>(null);
    const [sohbetler, setSohbetler] = useState<SohbetPartneri[]>([]);
    const [seciliPartner, setSeciliPartner] = useState<SohbetPartneri | null>(null);
    const [mesajlar, setMesajlar] = useState<Mesaj[]>([]);
    const [mesajInput, setMesajInput] = useState('');
    const [yukleniyor, setYukleniyor] = useState(true);
    const [mobilListeAcik, setMobilListeAcik] = useState(true);
    const [istekler, setIstekler] = useState<Istek[]>([]);
    const [aktifSekme, setAktifSekme] = useState<'mesajlar' | 'istekler'>('mesajlar');
    const [aktifSohbet, setAktifSohbet] = useState<string | null>(null);
    const [yeniSohbetAcik, setYeniSohbetAcik] = useState(false);
    const [sohbetAramaMetni, setSohbetAramaMetni] = useState('');
    const [sohbetAramaSonuclari, setSohbetAramaSonuclari] = useState<{ id: string, ad: string, avatar_url: string | null }[]>([]);
    const [aramaYukleniyor, setAramaYukleniyor] = useState(false);
    const [okunmamisSayilari, setOkunmamisSayilari] = useState<Record<string, number>>({});
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

    useEffect(() => {
        if (!kullanici) return;

        const tumMesajlariOkunduYap = async () => {
            const { error } = await supabase
                .from('mesajlar')
                .update({ okundu: true })
                .eq('alici_id', kullanici.id)
                .eq('okundu', false);

            if (error) {
                console.error('Tum mesajlar okundu guncelleme hatasi:', error);
                return;
            }

        };

        void tumMesajlariOkunduYap();
    }, [kullanici?.id]);

    useEffect(() => {
        if (kisiId) {
            setAktifSohbet(kisiId);
            setAktifSekme('mesajlar');
        }
    }, [kisiId]);

    useEffect(() => {
        if (!aktifSohbet) return;
        if (seciliPartner?.id === aktifSohbet) return;

        const listedenPartner = sohbetler.find((partner) => partner.id === aktifSohbet);
        if (listedenPartner) {
            setSeciliPartner(listedenPartner);
            setMobilListeAcik(false);
            return;
        }

        const aktifSohbetiAc = async () => {
            const { data: kisi, error } = await supabase
                .from('profiles')
                .select('id, ad')
                .eq('id', aktifSohbet)
                .single();

            if (error || !kisi) {
                console.error('Sohbet kisisi cekilemedi:', error);
                return;
            }

            setSeciliPartner({
                id: kisi.id,
                partner_id: kisi.id,
                ad: kisi.ad,
                avatar_url: null,
                sonMesaj: '',
                sonMesajTarihi: '',
                okunmamisVarMi: false,
            });
            setMobilListeAcik(false);
        };

        void aktifSohbetiAc();
    }, [aktifSohbet, seciliPartner?.id, sohbetler]);

    useEffect(() => {
        if (!yeniSohbetAcik || sohbetAramaMetni.length < 2) {
            setSohbetAramaSonuclari([]);
            return;
        }

        const ara = async () => {
            setAramaYukleniyor(true);
            const { data } = await supabase
                .from('profiles')
                .select('id, ad, avatar_url')
                .ilike('ad', `%${sohbetAramaMetni}%`)
                .neq('id', kullanici?.id)
                .limit(5);

            setSohbetAramaSonuclari(data || []);
            setAramaYukleniyor(false);
        };

        const timer = setTimeout(ara, 300);
        return () => clearTimeout(timer);
    }, [sohbetAramaMetni, yeniSohbetAcik, kullanici?.id]);

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
                    partner_id: partnerId,
                    ad: partner?.ad || 'Bilinmeyen Kullanıcı',
                    avatar_url: partner?.avatar_url || null,
                    sonMesaj: m.icerik,
                    sonMesajTarihi: m.created_at,
                    okunmamisVarMi: !isGonderen && !m.okundu,
                });
            }
        }

        const yeniSohbetler = Array.from(sohbetMap.values());
        setSohbetler(yeniSohbetler);

        const dict: Record<string, number> = {};
        for (const sohbet of yeniSohbetler) {
            const { count } = await supabase
                .from('mesajlar')
                .select('id', { count: 'exact', head: true })
                .eq('gonderen_id', sohbet.id)
                .eq('alici_id', userId)
                .eq('okundu', false);

            dict[sohbet.id] = count || 0;
        }

        setOkunmamisSayilari(dict);
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
        if (!aktifSohbet || !kullanici?.id) return;

        const channel = supabase
            .channel(`mesajlar-${aktifSohbet}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'mesajlar',
                filter: `alici_id=eq.${kullanici.id}`
            }, (payload: any) => {
                setMesajlar((prev) => [...prev, payload.new as Mesaj]);

                const gonderenId = payload.new.gonderen_id;
                if (gonderenId !== kullanici.id) {
                    setOkunmamisSayilari(prev => ({
                        ...prev,
                        [gonderenId]: (prev[gonderenId] || 0) + 1
                    }));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [aktifSohbet, kullanici?.id]);

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

    const sohbetiSil = async (partnerId: string) => {
        if (!kullanici) return;

        const onay = confirm('Bu sohbeti silmek istiyor musunuz?');
        if (!onay) return;

        await supabase
            .from('mesajlar')
            .delete()
            .or(
                `and(gonderen_id.eq.${kullanici.id},alici_id.eq.${partnerId}),` +
                `and(gonderen_id.eq.${partnerId},alici_id.eq.${kullanici.id})`
            );

        setSohbetler(prev =>
            prev.filter(s => s.partner_id !== partnerId)
        );
        setAktifSohbet(null);
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
                    <div className="flex bg-white/5 relative">
                        <button
                            onClick={() => setAktifSekme('mesajlar')}
                            className={`flex-1 py-4 text-sm text-center transition tracking-wide pr-8 ${aktifSekme === 'mesajlar'
                                ? 'border-b-2 border-green-400 text-white font-bold'
                                : 'text-white/40 hover:text-white'
                                }`}
                        >
                            Mesajlar
                        </button>
                        <button
                            onClick={() => setAktifSekme('istekler')}
                            className={`flex-1 py-4 text-sm text-center flex items-center justify-center gap-2 transition tracking-wide pr-8 ${aktifSekme === 'istekler'
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
                        <button
                            onClick={() => setYeniSohbetAcik(true)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 hover:bg-white/10 transition"
                            title="Yeni Sohbet Başlat"
                        >
                            <Plus className="w-5 h-5 text-white/70 hover:text-white transition" />
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
                                sohbetler.map(sohbet => {
                                    console.log('sohbet objesi:', JSON.stringify(sohbet));
                                    console.log('okunmamisSayilari:', JSON.stringify(okunmamisSayilari));
                                    return (
                                    <div
                                        key={sohbet.id}
                                        onClick={() => {
                                            setSeciliPartner(sohbet);
                                            setAktifSohbet(sohbet.id);
                                            setMobilListeAcik(false); // Mobilde listeyi gizle, sohbeti aç
                                        }}
                                        className={`w-full flex items-center gap-3 p-4 border-b border-white/5 transition hover:bg-white/5 text-left
                                            ${seciliPartner?.id === sohbet.id ? 'bg-green-900/50' : ''}`}
                                    >
                                        <div className="flex shrink-0 h-10 w-10 items-center justify-center rounded-full bg-green-600 text-sm font-black text-white relative">
                                            {sohbet.ad ? sohbet.ad.charAt(0).toLocaleUpperCase('tr-TR') : '?'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-white text-sm truncate">{sohbet.ad}</h3>
                                            <p className="text-xs text-white/40 truncate">{sohbet.sonMesaj}</p>
                                        </div>
                                        {(okunmamisSayilari[sohbet.id] || 0) > 0 && (
                                            <span className="h-5 w-5 rounded-full bg-green-400 text-[10px] font-bold text-green-950 flex items-center justify-center flex-shrink-0">
                                                {okunmamisSayilari[sohbet.id]}
                                            </span>
                                        )}
                                        <button onClick={(event) => {
                                            event.stopPropagation();
                                            void sohbetiSil(sohbet.partner_id);
                                        }}
                                            className="ml-auto text-white/30 hover:text-red-400 transition flex-shrink-0">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                )})
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
                                        {isBenim ? (
                                            <div className="flex items-center gap-1 justify-end">
                                                <div className="rounded-2xl bg-green-600 px-4 py-2 text-white">
                                                    {mesaj.icerik}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="max-w-[75%] rounded-2xl rounded-tl-sm bg-white/10 px-4 py-2 text-sm text-white">
                                                {mesaj.icerik}
                                            </div>
                                        )}
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

            {/* YENİ SOHBET MODALI */}
            {yeniSohbetAcik && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setYeniSohbetAcik(false)}>
                    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-green-950/95 p-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-white">Yeni Sohbet Başlat</h3>
                            <button onClick={() => setYeniSohbetAcik(false)} className="text-white/50 hover:text-white transition rounded-full hover:bg-white/10 p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                            <input
                                type="text"
                                placeholder="Oyuncu ara..."
                                value={sohbetAramaMetni}
                                onChange={(e) => setSohbetAramaMetni(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-white/30 focus:border-green-400 focus:outline-none focus:ring-1 focus:ring-green-400"
                                autoFocus
                            />
                        </div>
                        <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
                            {aramaYukleniyor && <div className="p-3 text-center text-sm text-white/40">Aranıyor...</div>}
                            {!aramaYukleniyor && sohbetAramaMetni.length >= 2 && sohbetAramaSonuclari.length === 0 && (
                                <div className="p-3 text-center text-sm text-white/40">Sonuç bulunamadı.</div>
                            )}
                            {sohbetAramaMetni.length < 2 && (
                                <div className="p-3 text-center text-xs text-white/30">Aramak için en az 2 karakter girin.</div>
                            )}
                            {sohbetAramaSonuclari.map((kisi) => (
                                <button
                                    key={kisi.id}
                                    onClick={() => {
                                        setAktifSohbet(kisi.id);
                                        setYeniSohbetAcik(false);
                                        setSohbetAramaMetni('');
                                    }}
                                    className="flex items-center gap-3 rounded-xl p-2 hover:bg-white/10 transition text-left"
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-sm font-black text-white shrink-0">
                                        {kisi.ad ? kisi.ad.charAt(0).toLocaleUpperCase('tr-TR') : '?'}
                                    </div>
                                    <span className="text-sm font-bold text-white truncate">{kisi.ad}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function MesajlarPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-green-950 flex items-center justify-center text-white/50">Yükleniyor...</div>}>
            <MesajlarIcerik />
        </Suspense>
    );
}



