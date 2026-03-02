'use client';

import { supabase } from '@/lib/supabase';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

export default function AuthCallbackPage() {
  const router = useRouter();
  const yonlendirildiRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const yonlendir = async (user: User) => {
      if (cancelled || yonlendirildiRef.current) return;
      yonlendirildiRef.current = true;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('tip')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        router.replace('/login?error=profile_fetch_failed');
        return;
      }

      if (!profile) {
        router.replace('/profil-tamamla');
        return;
      }

      if (profile.tip === 'futbolcu') {
        router.replace('/profil');
        return;
      }

      if (profile.tip === 'saha') {
        router.replace('/halisaha/panel');
        return;
      }

      if (profile.tip === 'admin') {
        router.replace('/admin');
        return;
      }

      router.replace('/profil-tamamla');
    };

    const init = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        router.replace('/login?error=session_fetch_failed');
        return;
      }

      if (data.session?.user) {
        await yonlendir(data.session.user);
        return;
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          if (timeoutId) clearTimeout(timeoutId);
          await yonlendir(session.user);
        }
      });

      timeoutId = setTimeout(() => {
        if (!cancelled && !yonlendirildiRef.current) {
          router.replace('/login?error=oauth_session_missing');
        }
      }, 2000);

      return subscription;
    };

    let subscription: { unsubscribe: () => void } | undefined;

    init().then((sub) => {
      subscription = sub;
    });

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };
  }, [router]);

  return (
    <div className="mx-auto mt-24 max-w-md px-4 text-center">
      <p className="text-sm text-gray-500">Giriş tamamlanıyor...</p>
    </div>
  );
}
