import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () =>
          request.cookies.getAll().map((c) => ({ name: c.name, value: c.value })),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const loginPath = '/login';
    const authCallbackPath = '/auth/callback';
    const profilPath = '/profil';
    const halisahaPanelPath = '/halisaha/panel';

    const routeStartsWith = (basePath: string) =>
      pathname === basePath || pathname.startsWith(`${basePath}/`);
    const redirectTo = (target: string) =>
      NextResponse.redirect(new URL(target, request.url));

    if (!user) {
      if (
        routeStartsWith(halisahaPanelPath) ||
        routeStartsWith(profilPath) ||
        routeStartsWith('/profil-tamamla')
      ) {
        return redirectTo(loginPath);
      }
      return response;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tip')
      .eq('id', user.id)
      .maybeSingle();

    const tip = profile?.tip ?? null;

    if (tip === 'saha') {
      const sahaEngelliRotalar = ['/', profilPath, '/ilanlar', '/sahalar', '/harita'];
      const authRotalari = [loginPath, '/kayit', '/kayit/halisaha', authCallbackPath];
      const sahaYasak = [...sahaEngelliRotalar, ...authRotalari].some((route) =>
        routeStartsWith(route)
      );

      if (sahaYasak) {
        return redirectTo(halisahaPanelPath);
      }
    }

    if (tip === 'futbolcu') {
      if (routeStartsWith(halisahaPanelPath) || routeStartsWith('/halisaha/beklemede')) {
        return redirectTo(profilPath);
      }
    }

    return response;
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
