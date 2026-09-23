import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BLUE_MID, BLUE_POP, BORDER, DISPLAY_FONT, NEON, NEON_D, PAGE_BG, WHITE_DIM, WHITE_SUB } from "../theme";
import { Notice, PickleProLogo, fieldStyle, labelClass, labelStyle } from "../shell/primitives";

type Mode = "sign_in" | "sign_up";

/** Supabase email + password authentication. Replaces the former hard-coded demo account. */
export function AuthScreen({ sb }: { sb: SupabaseClient }) {
  const [mode, setMode] = useState<Mode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!email.trim() || !password) return setError("Enter your email and password.");
    if (mode === "sign_up" && password.length < 8) return setError("Use at least 8 characters for your password.");
    setBusy(true);
    try {
      if (mode === "sign_in") {
        const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const { data, error } = await sb.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) setInfo("Check your email to confirm your account, then sign in.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: PAGE_BG, fontFamily: "'Inter', sans-serif" }}>
      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <PickleProLogo size="lg" />
          <p className="text-sm text-center mt-3" style={{ color: WHITE_DIM }}>
            Personal informatics for pickleball — fixed-camera video analysis
          </p>
        </div>
        <div className="rounded-2xl p-8" style={{ background: BLUE_MID, border: `1px solid ${BORDER}`, boxShadow: `0 24px 64px rgba(7,26,62,0.7)` }}>
          <h2 className="text-white mb-1" style={{ fontFamily: DISPLAY_FONT, letterSpacing: "0.04em", fontSize: "1.4rem", fontWeight: 700 }}>
            {mode === "sign_in" ? "Sign in" : "Create an account"}
          </h2>
          <p className="text-xs mb-6" style={{ color: WHITE_SUB }}>
            Your sessions, videos and results are private to your account.
          </p>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
              <label className={labelClass} style={labelStyle} htmlFor="email">Email address</label>
              <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={fieldStyle} />
            </div>
            <div>
              <label className={labelClass} style={labelStyle} htmlFor="password">Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={fieldStyle} />
            </div>
            {error && <Notice tone="error">{error}</Notice>}
            {info && <Notice>{info}</Notice>}
            <button type="submit" disabled={busy}
              className="w-full rounded-xl py-3.5 font-bold text-sm disabled:opacity-60"
              style={{ background: NEON, color: NEON_D, fontFamily: DISPLAY_FONT, fontSize: "1rem", letterSpacing: "0.08em" }}>
              {busy ? "PLEASE WAIT…" : mode === "sign_in" ? "SIGN IN →" : "CREATE ACCOUNT →"}
            </button>
          </form>
          <p className="text-center text-[11px] mt-6" style={{ color: WHITE_SUB }}>
            {mode === "sign_in" ? "No account yet? " : "Already registered? "}
            <button type="button" className="font-semibold" style={{ color: NEON }}
              onClick={() => { setMode(mode === "sign_in" ? "sign_up" : "sign_in"); setError(""); setInfo(""); }}>
              {mode === "sign_in" ? "Create one" : "Sign in"}
            </button>
          </p>
        </div>
        <p className="text-center text-[10px] mt-4" style={{ color: `${BLUE_POP}` }}>
          Research prototype · DLSU CAPIT-01
        </p>
      </div>
    </div>
  );
}
