//backend/src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

import {
  authenticateUser,
  determineRole,
  isAllowedEmail,
} from '@/lib/auth/credentials-provider';

import { query } from '@/lib/db/db';

interface DbUser {
  user_id: number;
  email: string;
  full_name: string;
  role: string;
}

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),

    CredentialsProvider({
      name: 'Email & Password',

      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'example@bracu.ac.bd',
        },
        password: {
          label: 'Password',
          type: 'password',
        },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const email = credentials.email.trim().toLowerCase();

        if (!isAllowedEmail(email)) {
          throw new Error(
            'Only @bracu.ac.bd and @g.bracu.ac.bd accounts are allowed'
          );
        }

        const user = await authenticateUser(
          email,
          credentials.password
        );

        if (!user) {
          throw new Error('Invalid email or password');
        }

        return {
          id: user.user_id.toString(),
          email: user.email,
          name: user.full_name,
          role: user.role,
        };
      },
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  debug: true,

  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60,
  },

  callbacks: {
    async signIn({ user, account }) {
      /*
       * Google authentication
       */
      if (account?.provider === 'google') {
        if (!user.email) {
          return false;
        }

        const email = user.email.trim().toLowerCase();

        // Reject non-BRACU Google accounts
        if (!isAllowedEmail(email)) {
          return false;
        }

        const role = determineRole(email);

        try {
          const existingUsers = await query<DbUser[]>(
            `
            SELECT
              user_id,
              email,
              full_name,
              role
            FROM users
            WHERE LOWER(email) = ?
            LIMIT 1
            `,
            [email]
          );

          /*
           * If the Google user already exists,
           * use their database record.
           */
          if (existingUsers.length > 0) {
            const dbUser = existingUsers[0];

            if (dbUser.role.toLowerCase() !== role) {
              console.error(
                `Role mismatch for Google user ${email}`
              );

              return false;
            }

            user.id = dbUser.user_id.toString();
            user.name = dbUser.full_name;
            user.email = dbUser.email;
            user.role = role;

            return true;
          }

          /*
           * Google signup:
           * Create the user if they don't exist.
           *
           * This assumes your users table allows
           * password_hash to be NULL for Google users.
           */
          const result = await query<any>(
            `
            INSERT INTO users
              (email, full_name, role, password_hash)
            VALUES
              (?, ?, ?, NULL)
            `,
            [
              email,
              user.name || email.split('@')[0],
              role,
            ]
          );

          user.id = result.insertId.toString();
          user.role = role;

          return true;
        } catch (error) {
          console.error(
            'Google authentication database error:',
            error
          );

          return false;
        }
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role as string;
      }

      return session;
    },
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
});

export { handler as GET, handler as POST };