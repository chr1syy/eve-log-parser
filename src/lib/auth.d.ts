/**
 * Type augmentation for next-auth
 * Extends the default Session and User types with custom EVE Online character fields
 */

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: {
      id?: string;
      email?: string | null;
      image?: string | null;
      character_id?: string;
      character_name?: string;
      corporation_id?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    character_id?: string;
    character_name?: string;
    corporation_id?: string;
  }
}
