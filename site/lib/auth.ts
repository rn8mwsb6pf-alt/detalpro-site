// lib/auth.ts — Конфигурация NextAuth
import { NextAuthOptions, getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { sql } from './db';
import type { DbUser } from './db';

declare module 'next-auth' {
  interface Session {
    user: { id: string; email: string; name: string; role: string };
  }
  interface User {
    id: string; role: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT { id: string; role: string; }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },

  pages: {
    signIn: '/auth/login',
    error:  '/auth/login',
  },

  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',  type: 'email' },
        password: { label: 'Пароль', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const [user] = await sql<DbUser[]>`
          SELECT * FROM users WHERE email = ${credentials.email.toLowerCase()} LIMIT 1
        `;
        if (!user) return null;

        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;

        return {
          id:    user.id,
          email: user.email,
          name:  [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
          role:  user.role,
        };
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      if (user) { token.id = user.id; token.role = user.role; }
      return token;
    },
    session({ session, token }) {
      session.user.id   = token.id;
      session.user.role = token.role;
      return session;
    },
  },
};

// Хелпер для Server Components
export const getSession = () => getServerSession(authOptions);

// Хелпер: получить роль из запроса (используем в API-роутах)
export async function getRole(): Promise<'customer' | 'manager' | 'admin'> {
  const session = await getSession();
  return (session?.user.role as 'customer' | 'manager' | 'admin') ?? 'customer';
}
