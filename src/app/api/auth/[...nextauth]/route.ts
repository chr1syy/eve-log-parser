/**
 * Next-auth API Route Handler
 * Provides OAuth flow endpoints and session management
 * This handles all /api/auth/* requests
 */

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
