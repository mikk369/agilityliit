import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!passwordMatch) return null;

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    /**
     * The role and the password both live outside the token, so the token is
     * re-checked against the database rather than trusted for its full 30 days:
     * a demoted admin loses access, and a password reset ends sessions that
     * were already open. One indexed lookup per token refresh, not per request.
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.issuedAt = Date.now();
        return token;
      }

      if (!token.id) return token;

      const current = await prisma.user.findUnique({
        where: { id: parseInt(token.id) },
        select: { role: true, passwordChangedAt: true },
      });

      // Deleted account, or the password changed after this token was issued.
      // NextAuth v4 requires a token back, so the session is marked revoked and
      // both the middleware and requireAuth() refuse it.
      const revoked =
        !current ||
        Boolean(
          current.passwordChangedAt &&
            current.passwordChangedAt.getTime() > (token.issuedAt ?? 0)
        );

      if (revoked) {
        token.revoked = true;
        return token;
      }

      delete token.revoked;
      token.role = current!.role;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // A revoked token yields a session nothing accepts — requireAuth() and
        // the middleware both treat a missing id as signed out.
        session.user.id = token.revoked ? "" : (token.id as string);
        session.user.role = token.revoked ? "" : (token.role as string);
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
