/**
 * Logout API Endpoint
 * Handles user logout requests by clearing session
 */

import { signOut } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/logout
 * Signs out the user and clears their session
 */
export async function POST() {
  try {
    // Use next-auth's signOut function
    // This will clear the session cookie and database session entry
    await signOut({ redirect: false });

    return NextResponse.json(
      { success: true, message: "Logged out successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Auth] Logout error:", error);
    return NextResponse.json(
      { success: false, message: "Logout failed" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/auth/logout
 * Alternative logout endpoint for simple click-to-logout links
 * Redirects to home after logout
 */
export async function GET(request: NextRequest) {
  try {
    const response = await signOut({ redirect: true, redirectTo: "/" });
    return response ?? NextResponse.redirect(new URL("/", request.url));
  } catch (error) {
    console.error("[Auth] Logout error:", error);
    return NextResponse.redirect(new URL("/", request.url));
  }
}
