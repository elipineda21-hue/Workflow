import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { Zap } from "lucide-react";

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mondayTokenInput, setMondayTokenInput] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              monday_token: mondayTokenInput.trim() || "",
            },
          },
        });
        if (signUpError) throw signUpError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark to-navy flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center animate-pulse">
            <Zap size={18} className="text-accent" />
          </div>
          <span className="text-white/50 text-sm font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  // Authenticated — render children with user and signOut
  if (session) {
    return children(session.user, signOut);
  }

  // Login / Signup form
  return (
    <div className="min-h-screen bg-gradient-to-br from-dark to-navy flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center mb-3">
            <Zap size={24} className="text-accent" />
          </div>
          <h1 className="text-white font-bold text-xl tracking-tight">ProjectPal</h1>
          <p className="text-white/30 text-xs mt-1">Sign in to manage your projects</p>
        </div>

        {/* Form card */}
        <div className="bg-white/[0.06] backdrop-blur border border-white/[0.1] rounded-2xl p-6 shadow-2xl">
          <h2 className="text-white font-semibold text-sm mb-5">
            {mode === "signin" ? "Sign In" : "Create Account"}
          </h2>

          {error && (
            <div className="bg-danger/10 border border-danger/30 rounded-lg px-3 py-2 mb-4">
              <p className="text-danger text-xs font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="text-white/50 text-[10px] font-semibold uppercase tracking-wider block mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@company.com"
                className="w-full py-2.5 px-3 rounded-lg bg-white/[0.08] border border-white/[0.12] text-white text-sm outline-none placeholder:text-white/25 focus:border-accent/50 transition-colors"
              />
            </div>

            <div>
              <label className="text-white/50 text-[10px] font-semibold uppercase tracking-wider block mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                placeholder="••••••••"
                minLength={6}
                className="w-full py-2.5 px-3 rounded-lg bg-white/[0.08] border border-white/[0.12] text-white text-sm outline-none placeholder:text-white/25 focus:border-accent/50 transition-colors"
              />
            </div>

            {mode === "signup" && (
              <div>
                <label className="text-white/50 text-[10px] font-semibold uppercase tracking-wider block mb-1">
                  Monday.com API Token <span className="text-white/20">(optional — add later in settings)</span>
                </label>
                <input
                  type="password"
                  value={mondayTokenInput}
                  onChange={(e) => setMondayTokenInput(e.target.value)}
                  placeholder="eyJhbGci..."
                  className="w-full py-2.5 px-3 rounded-lg bg-white/[0.08] border border-white/[0.12] text-white text-sm outline-none placeholder:text-white/25 focus:border-accent/50 transition-colors"
                />
                <div className="text-white/20 text-[9px] mt-1">Find at: monday.com → Avatar → Developers → API v2 Token</div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full py-2.5 rounded-lg bg-accent hover:bg-accent/90 disabled:opacity-50 text-white text-sm font-semibold border-none cursor-pointer transition-colors"
            >
              {submitting
                ? "Please wait..."
                : mode === "signin"
                  ? "Sign In"
                  : "Create Account"}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-white/[0.08] text-center">
            <button
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError("");
              }}
              className="text-accent/70 hover:text-accent text-xs font-medium bg-transparent border-none cursor-pointer transition-colors"
            >
              {mode === "signin"
                ? "Don't have an account? Sign Up"
                : "Already have an account? Sign In"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
