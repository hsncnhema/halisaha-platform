'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function NavigationLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const ilkRenderRef = useRef(true);

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

      setLoading(true);
    };

    const popstateListener = () => {
      setLoading(true);
    };

    document.addEventListener('click', clickListener, true);
    window.addEventListener('popstate', popstateListener);

    return () => {
      document.removeEventListener('click', clickListener, true);
      window.removeEventListener('popstate', popstateListener);
    };
  }, []);

  useEffect(() => {
    if (ilkRenderRef.current) {
      ilkRenderRef.current = false;
      return;
    }

    let aktif = true;
    const baslatTimer = setTimeout(() => {
      if (aktif) {
        setLoading(true);
      }
    }, 0);
    const minSure = new Promise((resolve) =>
      setTimeout(resolve, 800)
    );
    const sayfaYuklendi = new Promise((resolve) =>
      setTimeout(resolve, 100)
    );

    void Promise.all([minSure, sayfaYuklendi]).then(() => {
      if (aktif) {
        setLoading(false);
      }
    });

    return () => {
      aktif = false;
      clearTimeout(baslatTimer);
    };
  }, [pathname]);

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
