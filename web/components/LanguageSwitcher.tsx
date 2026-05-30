"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { locales, type Locale } from "@/i18n/routing";

const LANG_FLAGS: Record<Locale, string> = {
  en: "🇬🇧", es: "🇪🇸", fr: "🇫🇷", de: "🇩🇪",
  pt: "🇵🇹", it: "🇮🇹", ja: "🇯🇵", zh: "🇨🇳", eo: "🌐",
};

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const t = useTranslations("langs");
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function switchLocale(next: Locale) {
    setOpen(false);
    // Replace the current locale prefix in the pathname
    const segments = pathname.split("/");
    segments[1] = next;
    router.push(segments.join("/") || "/");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
        aria-label="Switch language"
      >
        <span>{LANG_FLAGS[locale]}</span>
        <span className="hidden sm:inline text-xs uppercase tracking-wide">{locale}</span>
        <svg className="w-3 h-3 opacity-40" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 8L1 3h10L6 8z"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 min-w-[160px]">
          {locales.map((l) => (
            <button
              key={l}
              onClick={() => switchLocale(l)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                l === locale
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="text-base">{LANG_FLAGS[l]}</span>
              <span>{t(l)}</span>
              {l === locale && <span className="ml-auto text-white/30 text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
