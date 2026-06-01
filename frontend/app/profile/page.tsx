"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useRooms } from "@/lib/rooms-context";
import { useDictionary, t } from "@/lib/i18n/useDictionary";
import { type Lang, supported } from "@/lib/i18n/useLang";
import { langConfigs } from "@/lib/i18n/langConfig";
import { logout, clearToken, getMyPoints } from "@/lib/api";
import StatCard from "@/components/StatCard";
import ProfileInfoRow from "@/components/ProfileInfoRow";
import NotificationSettings from "@/components/NotificationSettings";

type SelectOption = { value: string; label: string };

function SettingSelect({ value, options, onChange }: {
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700/70"
      >
        {current?.label}
        <svg
          className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-10 mt-1.5 min-w-full overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
                value === opt.value
                  ? "bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300"
                  : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                {value === opt.value && (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileContent() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { dict, isLoading } = useDictionary("profile");
  const {
    myRooms,
    isLoading: isLoadingRooms,
    fetchRooms,
  } = useRooms();

  const [myPoints, setMyPoints] = useState<number | null>(null);
  const [isLoadingPoints, setIsLoadingPoints] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    fetchRooms(true);
  }, [user, fetchRooms]);

  useEffect(() => {
    if (!user) return;

    let ignore = false;

    const fetchPoints = async () => {
      try {
        setIsLoadingPoints(true);
        const result = await getMyPoints();

        if (!ignore) {
          setMyPoints(result.data.points);
        }
      } catch (error) {
        console.error("Failed to load user points:", error);

        if (!ignore) {
          setMyPoints(null);
        }
      } finally {
        if (!ignore) {
          setIsLoadingPoints(false);
        }
      }
    };

    fetchPoints();

    return () => {
      ignore = true;
    };
  }, [user]);

  const [lang, setLang] = useState<Lang>("en");
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");

  useEffect(() => {
    const storedLang = localStorage.getItem("lang") as Lang | null;
    if (storedLang && (supported as readonly string[]).includes(storedLang)) {
      setLang(storedLang);
    } else {
      const browser = navigator.language?.slice(0, 2) as Lang | undefined;
      if (browser && (supported as readonly string[]).includes(browser)) setLang(browser);
    }

    const storedTheme = localStorage.getItem("theme") as "light" | "dark" | "system" | null;
    setTheme(storedTheme || "system");
  }, []);

  const switchLang = (next: Lang) => {
    localStorage.setItem("lang", next);
    setLang(next);
    window.location.reload();
  };

  const switchTheme = (next: "light" | "dark" | "system") => {
    setTheme(next);
    localStorage.setItem("theme", next);

    const isDark = next === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : next === "dark";

    document.documentElement.classList.toggle("dark", isDark);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Ignore errors, just clear locally
    } finally {
      clearToken();
      localStorage.removeItem("user");
      window.location.href = "/";
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col flex-1 p-4">
        <div className="animate-pulse h-8 w-24 bg-zinc-200 rounded" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const currentUser = user;

  const displayName = currentUser.name || "User";
  const username = currentUser.username || "username";
  const email = currentUser.email || "user@example.com";
  const phone = currentUser.phone || "尚未提供";

  const createdRoomCount = myRooms.filter((room) => room.is_owner).length;
  const joinedRoomCount = myRooms.filter((room) => !room.is_owner).length;

  const pointValue = isLoadingPoints ? 0 : myPoints ?? 0;

  const langOptions: SelectOption[] = supported.map((code) => ({
    value: code,
    label: langConfigs[code]?.nativeName || code,
  }));

  const themeOptions: SelectOption[] = [
    { value: "light", label: t(dict, "profile.settings.themeLight", "Light") },
    { value: "dark", label: t(dict, "profile.settings.themeDark", "Dark") },
    { value: "system", label: t(dict, "profile.settings.themeSystem", "System") },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 md:text-4xl">
          {t(dict, "profile.profile.title", "個人檔案")}
        </h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          {t(dict, "profile.profile.subtitle", "帳號與偏好設定")}
        </p>
      </div>

      <section className="overflow-hidden rounded-3xl border border-zinc-200/70 bg-white/80 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
        <div className="grid gap-6 p-6 md:grid-cols-[auto_1fr] md:p-10">
          <div className="flex justify-center md:block">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-600 text-4xl font-bold text-white shadow-xl shadow-purple-500/20">
              {displayName[0]?.toUpperCase() || "N"}
            </div>
          </div>

          <div className="flex flex-col justify-center text-center md:text-left">
            <p className="text-3xl font-bold text-zinc-950 dark:text-zinc-50">
              {displayName}
            </p>
            <p className="mt-1 text-purple-600 dark:text-purple-400">
              @{username}
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label={t(dict, "profile.stats.joinedRooms", "加入房間")}
                value={isLoadingRooms ? 0 : joinedRoomCount}
                tone="purple"
              />
              <StatCard
                label={t(dict, "profile.stats.createdRooms", "建立房間")}
                value={isLoadingRooms ? 0 : createdRoomCount}
                tone="blue"
              />
              <StatCard
                label={t(dict, "profile.stats.friends", "好友")}
                value={0}
                tone="green"
              />
              <StatCard
                label="目前點數"
                value={pointValue}
                tone="purple"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-zinc-200/70 bg-white/85 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
          <div className="mb-3 px-2">
            <h2 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">
              {t(dict, "profile.sections.account", "帳號資訊")}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {t(
                dict,
                "profile.sections.accountDescription",
                "管理你的基本帳號資料",
              )}
            </p>
          </div>

          <div className="space-y-1">
            <ProfileInfoRow
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16v12H4z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7l8 6 8-6" />
                </svg>
              }
              label={t(dict, "profile.email", "電子郵件")}
              value={email}
            />

            <ProfileInfoRow
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h2l2 5-2 1a11 11 0 005 5l1-2 5 2v2a2 2 0 01-2 2h-1C8.373 18 3 12.627 3 6V5z" />
                </svg>
              }
              label={t(dict, "profile.phone", "電話號碼")}
              value={phone}
            />

            <ProfileInfoRow
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M3 11l8.5 8.5a2 2 0 002.8 0l5.2-5.2a2 2 0 000-2.8L11 3H3v8z" />
                </svg>
              }
              label={t(dict, "profile.preferences", "偏好類別")}
              value="尚未設定"
            />
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200/70 bg-white/85 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
          <div className="mb-3 px-2">
            <h2 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">
              {t(dict, "profile.sections.settings", "快速設定")}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {t(
                dict,
                "profile.sections.settingsDescription",
                "調整你的使用偏好",
              )}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-zinc-800 dark:text-zinc-100">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3a9 9 0 100 18 9 9 0 000-18z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
                </svg>
              </div>
              <p className="min-w-0 flex-1 font-semibold">
                {t(dict, "profile.settings.language", "語言設定")}
              </p>
              <SettingSelect value={lang} options={langOptions} onChange={(v) => switchLang(v as Lang)} />
            </div>

            <div className="flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-zinc-800 dark:text-zinc-100">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.36 6.36l-1.42-1.42M7.06 7.06L5.64 5.64m12.72 0l-1.42 1.42M7.06 16.94l-1.42 1.42M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              </div>
              <p className="min-w-0 flex-1 font-semibold">
                {t(dict, "profile.settings.theme", "主題設定")}
              </p>
              <SettingSelect value={theme} options={themeOptions} onChange={(v) => switchTheme(v as "light" | "dark" | "system")} />
            </div>

            <NotificationSettings />

            <ProfileInfoRow
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10a4 4 0 118 0c0 2-2 2.5-3 4" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01" />
                </svg>
              }
              label={t(dict, "profile.settings.help", "幫助中心")}
            />
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-red-200/70 bg-white/85 p-3 shadow-sm dark:border-red-900/60 dark:bg-zinc-900/70">
        <ProfileInfoRow
          danger
          onClick={handleLogout}
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H9" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 4H6a2 2 0 00-2 2v12a2 2 0 002 2h7" />
            </svg>
          }
          label={t(dict, "profile.logout", "登出帳號")}
        />
      </section>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col flex-1 p-4">
          <div className="animate-pulse h-8 w-24 bg-zinc-200 rounded" />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}