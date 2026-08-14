import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

// Minimal configuration for testing
const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-key-32-chars-long!!',
  debug: true,
});

export { handler as GET, handler as POST };