// middleware.ts — Защита приватных роутов
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role;

    // Только администраторы могут обращаться к /admin
    if (pathname.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // authorized вызывается до middleware — возвращаем true только если есть токен
      authorized({ token, req }) {
        const { pathname } = req.nextUrl;
        // /account требует авторизации
        if (pathname.startsWith('/account')) return !!token;
        // /admin требует роли
        if (pathname.startsWith('/admin'))   return !!token;
        return true;
      },
    },
    pages: { signIn: '/auth/login' },
  }
);

export const config = {
  matcher: ['/account/:path*', '/admin/:path*'],
};
