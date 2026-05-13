import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: getUser() заавал дуудах ёстой — энэ нь session-г refresh хийнэ
  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Auth routes
  const authPaths = ['/auth/login', '/auth/signup', '/auth/callback', '/auth/forgot-password', '/auth/verify', '/auth/forgot'];
  const isAuthPath = authPaths.some((p) => pathname.startsWith(p));

  // Public routes — leaderboard, puzzles нь зочин ч үзэж болно
  // (puzzle тоглохын тулд PuzzleSolver дотроо нэвтрэхийг шалгана)

  // Protected routes — нэвтрэх шаардлагатай
  const protectedPaths = ['/dashboard', '/lesson', '/account', '/admin'];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  // Нэвтрээгүй хэрэглэгч protected route орохыг хаах
  if (isProtected && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth/login';
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Нэвтэрсэн хэрэглэгч auth page руу орохыг хаах (callback-аас бусад)
  if (isAuthPath && user && !pathname.startsWith('/auth/callback')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Admin-only routes
  if (pathname.startsWith('/admin') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['teacher', 'admin'].includes((profile as { role: string }).role)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
