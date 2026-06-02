"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useDictionary, t } from "@/lib/i18n/useDictionary";
import BottomNav from "@/components/BottomNav";
import SettingsMenu from "@/components/SettingsMenu";

const navItems = [
  {
    href: "/",
    labelKey: "home",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10" />
      </svg>
    ),
  },
  {
    href: "/explore",
    labelKey: "explore",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.5 8.5l-2 5-5 2 2-5 5-2z" />
      </svg>
    ),
  },
  {
    href: "/profile",
    labelKey: "profile",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

function Sidebar() {
  const pathname = usePathname();
  const { dict } = useDictionary("common");

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside className="hidden md:flex h-screen w-68 shrink-0 flex-col border-r border-zinc-200/70 bg-white/70 px-5 py-6 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/70">
      <Link href="/" className="flex items-center gap-3 mb-12">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 3L4 14h7l-1 7 9-11h-7l1-7z" />
          </svg>
        </div>
        <span className="text-2xl font-bold tracking-tight">NoSquad</span>
      </Link>

      <nav className="space-y-3">
        {navItems.map((item) => {
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-medium transition-all ${
                active
                  ? "bg-purple-100/80 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
              }`}
            >
              {item.icon}
              <span>{t(dict, item.labelKey, item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function TopBar() {
  const { user } = useAuth();
  const { dict } = useDictionary("common");

  return (
    <header className="hidden md:flex h-20 shrink-0 items-center justify-end border-b border-zinc-200/70 dark:border-zinc-800/80 bg-white/55 dark:bg-zinc-950/55 backdrop-blur-xl px-8">
      <div className="flex items-center gap-4">
        <Link
          href="/rooms/create"
          className="h-11 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:opacity-90 flex items-center"
        >
          + {t(dict, "nav.createRoom", "Create Room")}
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900 dark:to-blue-900 flex items-center justify-center text-lg">
            {user?.name?.[0]?.toUpperCase() || "N"}
          </div>
          <div className="text-sm">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">
              {user?.name || "Name"}
            </p>
            <p className="text-zinc-500 dark:text-zinc-400">
              @{user?.username || "username"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

function MobileCreateRoomButton() {
  const { dict } = useDictionary("common");

  return (
    <Link
      href="/rooms/create"
      aria-label={t(dict, "nav.createRoom", "Create Room")}
      className="fixed bottom-24 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-3xl font-semibold leading-none text-white shadow-xl shadow-purple-500/30 transition active:scale-95 md:hidden"
    >
      +
    </Link>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const isChatPage = pathname?.startsWith("/rooms/chat");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const stored = localStorage.getItem("theme");
      if (!stored || stored === "system") {
        document.documentElement.classList.toggle("dark", mediaQuery.matches);
      }
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  if (isLoading) {
    return <div className="flex flex-col flex-1">{children}</div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col flex-1">
        <SettingsMenu />
        {children}
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[#fdfcff] dark:bg-zinc-950 app-bg">
      <div className="flex h-screen overflow-hidden">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden pb-16 md:pb-0">
          <TopBar />

          <main className={isChatPage ? "flex-1 overflow-hidden" : "flex-1 overflow-y-auto p-4 md:p-8"}>
            {children}
          </main>
        </div>

        {!isChatPage && <MobileCreateRoomButton />}

        <div className="md:hidden">
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
