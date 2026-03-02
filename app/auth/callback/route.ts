import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse, type NextRequest } from 'next/server';
import type { SerializeOptions } from 'cookie';
import { yonlendirmeYoluGetir } from '@/lib/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

type PendingCookie = {
  name: string;
  value: string;
  options: Partial<SerializeOptions>;
};

function varsayilanAd(email: string | null | undefined, metadata: Record<string, unknown>) {
  const tamAd = typeof metadata.full_name === 'string' ? metadata.full_name : '';
  const ad = typeof metadata.name === 'string' ? metadata.name : '';
  return tamAd || ad || email?.split('@')[0] || 'Kullanıcı';
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next');
  const oauthError = requestUrl.searchParams.get('error');

  const pendingCookies: PendingCookie[] = [];

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll().map((c) => ({ name: c.name, value: c.value })),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach((cookie) => {
          pendingCookies.push(cookie);
        });
      },
    },
  });

  if (oauthError) {
    return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=oauth_code_missing', request.url));
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error('OAuth code exchange error:', exchangeError.message);
    return NextResponse.redirect(new URL('/login?error=oauth_exchange_failed', request.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, tip')
    .eq('id', user.id)
    .maybeSingle();

  let yeniProfileOlustu = false;

  if (!profile) {
    await supabase.from('profiles').insert({
      id: user.id,
      ad: varsayilanAd(user.email, user.user_metadata as Record<string, unknown>),
      tip: 'futbolcu',
      avatar_url: user.user_metadata?.avatar_url ?? null,
    });

    await supabase
      .from('futbolcular')
      .upsert({ user_id: user.id, profil_tamamlandi: false }, { onConflict: 'user_id' });
    yeniProfileOlustu = true;
  } else if (profile.tip === 'futbolcu') {
    const { data: futbolcu } = await supabase
      .from('futbolcular')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!futbolcu) {
      await supabase
        .from('futbolcular')
        .upsert({ user_id: user.id, profil_tamamlandi: false }, { onConflict: 'user_id' });
    }
  }

  const hedef = next || (yeniProfileOlustu ? '/profil-tamamla' : await yonlendirmeYoluGetir(supabase, user.id));
  const redirectResponse = NextResponse.redirect(new URL(hedef, request.url));

  for (const cookie of pendingCookies) {
    redirectResponse.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  return redirectResponse;
}
