"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";

/**
 * Represents EVE Online character information
 */
export interface Character {
  id: string;
  name: string;
  corporationId?: string;
}

/**
 * Authentication context value
 */
export interface AuthContextValue {
  isAuthenticated: boolean;
  character: Character | null;
  isLoading: boolean;
  error?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * AuthProvider wraps the application with authentication context
 * Provides session-aware character information to child components
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Session is loaded when status is not "loading"
    setIsLoading(status === "loading");
  }, [status]);

  // Extract character information from session
  const character: Character | null = useMemo(() => {
    if (!session?.user) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;
    return {
      id: user.character_id ?? "",
      name: user.character_name ?? "",
      corporationId: user.corporation_id,
    };
  }, [session?.user]);

  const isAuthenticated = !!session?.user;

  const value: AuthContextValue = useMemo(
    () => ({
      isAuthenticated,
      character: isAuthenticated ? character : null,
      isLoading,
    }),
    [isAuthenticated, character, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access authentication context
 * Must be used within an AuthProvider
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
