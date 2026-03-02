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
      checks: ["pkce", "state"],
      authorization: {
        url: "https://login.eveonline.com/v2/oauth/authorize",
        params: {
          scope: "publicData esi-location.read_location.v1",
        },
      },
      token: "https://login.eveonline.com/v2/oauth/token",
      userinfo:
        "https://login.eveonline.com/oauth/verify",
      profile: async (profile) => {
        const characterId =
          profile.character_id ??
          profile.CharacterID ??
          profile.characterId ??
          profile.characterID;
        const characterName =
          profile.character_name ??
          profile.CharacterName ??
          profile.characterName;
        const corporationId =
          profile.corporation_id ??
          profile.CorporationID ??
          profile.corporationId;

        return {
          id: characterId != null ? String(characterId) : "unknown",
          name: characterName ?? "EVE Pilot",
          image:
            characterId != null
              ? `https://images.evetech.net/characters/${characterId}/portrait?size=64`
              : undefined,
          character_id: characterId,
          character_name: characterName,
          corporation_id: corporationId,
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
        token.character_id =
          profile.character_id ??
          profile.CharacterID ??
          profile.characterId ??
          profile.characterID;
        token.character_name =
          profile.character_name ??
          profile.CharacterName ??
          profile.characterName;
        token.corporation_id =
          profile.corporation_id ??
          profile.CorporationID ??
          profile.corporationId;
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
      const characterId =
        profile?.character_id ??
        profile?.CharacterID ??
        profile?.characterId ??
        profile?.characterID;
      return !!characterId;
    },
  },
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
