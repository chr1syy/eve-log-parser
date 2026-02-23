/**
 * Authentication utility functions
 * Server-side helpers for auth operations, session management, and character info extraction
 */

import { auth } from "@/lib/auth";

/**
 * Get current server-side session (for API routes and server components)
 * This is a wrapper around the NextAuth auth() function for consistency
 */
export async function getServerSession() {
  return await auth();
}

/**
 * Get current authenticated user from session
 * Returns user info or null if not authenticated
 */
export async function getCurrentUser() {
  const session = await getServerSession();
  if (!session?.user) {
    return null;
  }

  return {
    id: session.user.id,
    characterId: session.user.character_id,
    characterName: session.user.character_name,
    corporationId: session.user.corporation_id,
    email: session.user.email,
  };
}

/**
 * Extract character information from OAuth profile
 * Used to normalize character data from EVE SSO profile
 */
export function extractCharacterInfo(profile: any) {
  return {
    characterId: profile.character_id,
    characterName: profile.character_name,
    corporationId: profile.corporation_id,
  };
}

/**
 * Check if user is authenticated (server-side)
 * Returns true if session exists and has user data
 */
export async function isUserAuthenticated(): Promise<boolean> {
  const session = await getServerSession();
  return !!session?.user;
}

/**
 * Get character ID from current session
 * Returns character ID or null if not authenticated
 */
export async function getCurrentCharacterId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.characterId ?? null;
}

/**
 * Get character name from current session
 * Returns character name or null if not authenticated
 */
export async function getCurrentCharacterName(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.characterName ?? null;
}
