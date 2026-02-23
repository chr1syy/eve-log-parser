/**
 * Next.js Authentication Configuration
 * Configures OAuth 2.0 with EVE Online SSO using next-auth
 * Uses PostgreSQL adapter for persistent session storage
 */

import NextAuth, { type NextAuthConfig } from "next-auth";
import { PostgresAdapter } from "@auth/pg-adapter";
import { Pool } from "pg";

/**
 * Initialize PostgreSQL connection pool for next-auth adapter
 */
function getAuthPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is not set. Configure it in .env.local or your deployment environment.",
    );
  }

  return new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

/**
 * Next-auth configuration
 * Supports EVE Online OAuth 2.0 provider with custom claims for character info
 */
export const authConfig: NextAuthConfig = {
  adapter: PostgresAdapter(getAuthPool()),
  providers: [
    {
      id: "eve-sso",
      name: "EVE Online",
      type: "oauth",
      clientId: process.env.EVE_SSO_CLIENT_ID!,
      clientSecret: process.env.EVE_SSO_SECRET!,
      authorization: {
        url: "https://login.eveonline.com/v2/oauth/authorize",
        params: {
          scope: "publicData esi-location.read.location.v1",
        },
      },
      token: "https://login.eveonline.com/v2/oauth/token",
      userinfo:
        "https://esi.evetech.net/latest/characters/me/?datasource=tranquility",
      profile: async (profile) => {
        return {
          id: String(profile.character_id),
          name: profile.character_name,
          image: `https://images.evetech.net/characters/${profile.character_id}/portrait?size=64`,
          character_id: profile.character_id,
          character_name: profile.character_name,
          corporation_id: profile.corporation_id,
        };
      },
    },
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      },
    },
  },
  callbacks: {
    /**
     * Invoked after successful sign in
     * Used to add custom claims to JWT token
     */
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.character_id = profile.character_id;
        token.character_name = profile.character_name;
        token.corporation_id = profile.corporation_id;
      }
      return token;
    },

    /**
     * Invoked whenever session is checked
     * Used to add custom claims to session
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.character_id = token.character_id;
        session.user.character_name = token.character_name;
        session.user.corporation_id = token.corporation_id;
      }
      return session;
    },

    /**
     * Control sign in authorization
     * Can be used to restrict access based on character/corporation
     */
    async signIn({ profile }) {
      // Allow all EVE Online characters to sign in
      // Add custom logic here to restrict access if needed (e.g., whitelist corps)
      return !!profile?.character_id;
    },
  },
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
