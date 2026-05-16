"use client";

import { useState, useEffect, useRef } from "react";
import { type Lang, supported } from "@/lib/i18n/useLang";
import { langConfigs } from "@/lib/i18n/langConfig";

type SettingsMenuProps = {
  variant?: "floating" | "inline";
};

export default function SettingsMenu({ variant = "floating" }: SettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const ref = useRef<HTMLDivElement>(null);

  const applyTheme = (theme: "light" | "dark" | "system") => {
    const isDark = theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : theme === "dark";
    document.documentElement.classList.toggle("dark", isDark);
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const storedLang = localStorage.getItem("lang") as Lang | null;
    if (storedLang && (supported as readonly string[]).includes(storedLang)) {
      setLang(storedLang);
    } else {
      const browser = navigator.language?.slice(0, 2) as Lang | undefined;
      if (browser && (supported as readonly string[]).includes(browser)) {
        setLang(browser);
      }
    }

    const storedTheme = localStorage.getItem("theme") as "light" | "dark" | "system" | null;
    const initialTheme = storedTheme || "system";
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [theme]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const switchLang = (next: Lang) => {
    localStorage.setItem("lang", next);
    setLang(next);
    window.location.reload();
  };

  const switchTheme = (next: "light" | "dark" | "system") => {
    setTheme(next);
    localStorage.setItem("theme", next);
    applyTheme(next);
  };

  return (
    <div ref={ref} className={variant === "floating"? "fixed top-4 right-4 z-50": "relative z-50"}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Settings"
        className="w-9 h-9 rounded-full bg-white/75 dark:bg-zinc-800/75 backdrop-blur-md border border-gray-200 dark:border-zinc-700 shadow-sm flex items-center justify-center text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:shadow-md transition-all"
      >
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-11 right-0 w-60 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-gray-200 dark:border-zinc-700 p-3 space-y-3">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
              Language
            </p>
            <div className="flex p-0.5 bg-gray-100 dark:bg-zinc-800 rounded-lg">
              {supported.map((code) => (
                <button
                  key={code}
                  onClick={() => switchLang(code)}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                    lang === code
                      ? "bg-white dark:bg-zinc-700 shadow-sm text-gray-900 dark:text-white"
                      : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300"
                  }`}
                >
                  {langConfigs[code]?.nativeName || code}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-gray-100 dark:bg-zinc-800" />

          <div>
            <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
              Theme
            </p>
            <div className="flex p-0.5 bg-gray-100 dark:bg-zinc-800 rounded-lg">
              <button
                onClick={() => switchTheme("light")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-sm font-medium rounded-md transition-all ${
                  theme === "light"
                    ? "bg-white dark:bg-zinc-700 shadow-sm text-gray-900 dark:text-white"
                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300"
                }`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
                Light
              </button>
              <button
                onClick={() => switchTheme("dark")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-sm font-medium rounded-md transition-all ${
                  theme === "dark"
                    ? "bg-white dark:bg-zinc-700 shadow-sm text-gray-900 dark:text-white"
                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300"
                }`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
                Dark
              </button>
              <button
                onClick={() => switchTheme("system")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-sm font-medium rounded-md transition-all ${
                  theme === "system"
                    ? "bg-white dark:bg-zinc-700 shadow-sm text-gray-900 dark:text-white"
                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300"
                }`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5a1 1 0 00-1 1v3h10v-3a1 1 0 00-1-1h-4.771z" clipRule="evenodd" />
                </svg>
                System
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}