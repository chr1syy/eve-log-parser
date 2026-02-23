"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader } from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle auth errors from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");
    if (errorParam) {
      setError(`Authentication error: ${errorParam}`);
    }
  }, []);

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Sign in with EVE SSO provider
      const result = await signIn("eve-sso", {
        redirect: true,
        callbackUrl: "/",
      });

      // If signIn returns and doesn't redirect, there was an error
      if (result?.error) {
        setError(`Sign in failed: ${result.error}`);
        setIsLoading(false);
      }
    } catch (err) {
      setError("An unexpected error occurred during sign in");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-void flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-panel border border-border rounded-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-ui font-bold uppercase tracking-widest text-text-primary mb-2">
              EVE Log Parser
            </h1>
            <p className="text-text-muted font-mono text-xs uppercase tracking-wider">
              Sign in with EVE Online
            </p>
          </div>

          {/* Description */}
          <div className="mb-8 p-4 bg-elevated/50 border border-border rounded-sm">
            <p className="text-sm text-text-secondary font-ui leading-relaxed">
              Sign in with your EVE Online account to enable persistent log
              storage across devices and support for multiple characters.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-status-kill/20 border border-status-kill/40 rounded-sm">
              <p className="text-status-kill font-mono text-xs">{error}</p>
            </div>
          )}

          {/* Sign In Button */}
          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-glow hover:bg-cyan-glow/90 disabled:opacity-50 disabled:cursor-not-allowed text-space font-ui font-bold uppercase tracking-wider text-sm rounded-sm transition-all duration-150 mb-4"
          >
            {isLoading && <Loader className="w-4 h-4 animate-spin" />}
            {isLoading ? "Signing in..." : "Sign In with EVE Online"}
          </button>

          {/* Back Link */}
          <button
            onClick={() => router.push("/")}
            disabled={isLoading}
            className="w-full py-2 text-text-muted hover:text-text-secondary disabled:opacity-50 font-ui text-xs uppercase tracking-wider transition-colors"
          >
            Back to Home
          </button>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-border/50">
            <p className="text-xs text-text-muted font-mono text-center leading-relaxed">
              By signing in, you agree to our privacy policy and terms of
              service.
              <br />
              Your EVE Online account will only be used for authentication.
            </p>
          </div>
        </div>

        {/* Info Panel */}
        <div className="mt-6 p-4 bg-elevated/30 border border-border/30 rounded-sm">
          <p className="text-xs text-text-muted font-mono leading-relaxed">
            <span className="text-cyan-glow">●</span> Using EVE Online SSO
            <br />
            <span className="text-cyan-glow">●</span> No password required
            <br />
            <span className="text-cyan-glow">●</span> Secure OAuth 2.0
            authentication
          </p>
        </div>
      </div>
    </div>
  );
}
