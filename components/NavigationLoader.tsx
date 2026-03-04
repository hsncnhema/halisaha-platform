'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_VISIBLE_MS = 450;
const FALLBACK_HIDE_MS = 12000;

export default function NavigationLoader() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);

  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef(0);
  const pathKeyRef = useRef(`${pathname}?${searchParams.toString()}`);

  const temizleZamanlayicilar = useCallback(() => {
    if (finishTimerRef.current) {
      clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const yuklemeyiBaslat = useCallback(
    (nextHref?: string) => {
      temizleZamanlayicilar();
      startTimeRef.current = Date.now();
      setLoading(true);

      if (nextHref) {
        void router.prefetch(nextHref);
      }

      fallbackTimerRef.current = setTimeout(() => {
        setLoading(false);
      }, FALLBACK_HIDE_MS);
    },
    [router, temizleZamanlayicilar]
  );

  const yuklemeyiBitir = useCallback(() => {
    const gecenSure = Date.now() - startTimeRef.current;
    const bekleme = Math.max(0, MIN_VISIBLE_MS - gecenSure);

    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }

    finishTimerRef.current = setTimeout(() => {
      setLoading(false);
    }, bekleme);
  }, []);

  useEffect(() => {
    const clickListener = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== '_self') return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

      const nextUrl = new URL(anchor.href, window.location.href);
      if (nextUrl.origin !== window.location.origin) return;

      const currentUrl = new URL(window.location.href);
      const ayniRota = nextUrl.pathname === currentUrl.pathname && nextUrl.search === currentUrl.search;
      if (ayniRota) return;

      yuklemeyiBaslat(`${nextUrl.pathname}${nextUrl.search}`);
    };

    const popstateListener = () => {
      yuklemeyiBaslat();
    };

    document.addEventListener('click', clickListener, true);
    window.addEventListener('popstate', popstateListener);

    return () => {
      document.removeEventListener('click', clickListener, true);
      window.removeEventListener('popstate', popstateListener);
      temizleZamanlayicilar();
    };
  }, [temizleZamanlayicilar, yuklemeyiBaslat]);

  useEffect(() => {
    const pathKey = `${pathname}?${searchParams.toString()}`;
    if (pathKeyRef.current === pathKey) return;

    pathKeyRef.current = pathKey;

    if (!loading) {
      startTimeRef.current = Date.now();
      const timer = setTimeout(() => {
        setLoading(true);
        yuklemeyiBitir();
      }, 0);
      return () => clearTimeout(timer);
    }

    yuklemeyiBitir();
  }, [loading, pathname, searchParams, yuklemeyiBitir]);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-green-950">
      <div className="flex flex-col items-center gap-6">
        <div className="text-2xl font-black tracking-tight">
          <span className="text-green-400">saha</span>
          <span className="text-white">gram</span>
        </div>

        <div className="relative h-0.5 w-32 overflow-hidden rounded-full bg-white/10">
          <div
            className="absolute left-0 top-0 h-full w-1/3 rounded-full bg-green-400"
            style={{
              animation: 'navigation-loading-bar 1.2s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes navigation-loading-bar {
          0% { left: -33%; }
          100% { left: 133%; }
        }
      `}</style>
    </div>
  );
}
