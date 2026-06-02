"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createBrowserClient } from "@/lib/db/supabase";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}

export default function LoginPage() {
  const t = useTranslations("auth");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode]       = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError]     = useState("");

  const supabase = createBrowserClient();

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(""); setMessage("");
    const { error: err } = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (err) setError(err.message);
    else if (mode === "signup") setMessage(t("confirmEmail"));
    else window.location.href = `/${window.location.pathname.split("/")[1] || "en"}/profile`;
    setLoading(false);
  }

  async function handleGoogle() {
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (err) { setError(err.message); setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <Link href="/" className="font-bold text-lg tracking-tight">TourIt</Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-5">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">
              {mode === "signin" ? t("welcomeBack") : t("createAccount")}
            </h1>
            <p className="text-white/50 text-sm">
              {mode === "signin" ? t("signInSubtitle") : t("signUpSubtitle")}
            </p>
          </div>

          <button onClick={handleGoogle} disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-black py-3 rounded-xl font-semibold hover:bg-white/90 transition-colors disabled:opacity-60">
            <GoogleIcon />
            {t("continueGoogle")}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-xs">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            <input type="email" placeholder={t("emailPlaceholder")} value={email}
              onChange={(e) => setEmail(e.target.value)} required
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-white/50 transition-colors" />
            <input type="password" placeholder={t("passwordPlaceholder")} value={password}
              onChange={(e) => setPassword(e.target.value)} required minLength={8}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-white/50 transition-colors" />

            {error   && <p className="text-red-400 text-sm text-center">{error}</p>}
            {message && <p className="text-green-400 text-sm text-center">{message}</p>}

            <button type="submit" disabled={loading}
              className="w-full bg-white/20 hover:bg-white/30 py-3 rounded-xl font-semibold transition-colors disabled:opacity-60">
              {loading ? t("loading") : mode === "signin" ? t("signInButton") : t("signUpButton")}
            </button>
          </form>

          <p className="text-center text-sm text-white/40">
            {mode === "signin" ? (
              <>{t("noAccount")}{" "}
                <button onClick={() => { setMode("signup"); setError(""); setMessage(""); }} className="text-white underline">{t("signUpFree")}</button>
              </>
            ) : (
              <>{t("haveAccount")}{" "}
                <button onClick={() => { setMode("signin"); setError(""); setMessage(""); }} className="text-white underline">{t("signInLink")}</button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
