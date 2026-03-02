/**
 * Next.js Authentication Configuration
 * JWT-only sessions — no database required.
 * EVE character info is stored directly in the signed JWT cookie.
 */

import NextAuth, { type NextAuthConfig } from "next-auth";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";

export const authConfig: NextAuthConfig = {
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
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.character_id = profile.character_id;
        token.character_name = profile.character_name;
        token.corporation_id = profile.corporation_id;
      }
      return token;
    },

    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).character_id = token.character_id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).character_name = token.character_name;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).corporation_id = token.corporation_id;
      }
      return session;
    },

    async signIn({ profile }) {
      return !!profile?.character_id;
    },
  },
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
