"use client";

import { useRouter } from "next/navigation";
import type { RoomCategory } from "@/types/rooms";

// 房間列表卡片格式

type RoomCardProps = {
  title: string;
  date: string;
  location: string;
  members: string;
  status: string;
  statusTone?: "blue" | "green" | "purple" | "orange";
  icon?: string;
  category?: RoomCategory | null;
  detailHref?: string;
  chatHref?: string;
  unreadCount?: number;
};

const statusClassMap = {
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
  green:
    "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  purple:
    "bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300",
  orange:
    "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300",
};

const CATEGORY_CONFIG: Record<
  RoomCategory,
  { label: string; icon: string; bg: string; badge: string }
> = {
  sports: {
    label: "運動",
    icon: "🏃",
    bg: "from-green-50 to-emerald-50 dark:from-green-500/10 dark:to-emerald-500/10",
    badge: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  },
  study: {
    label: "學習",
    icon: "📚",
    bg: "from-blue-50 to-sky-50 dark:from-blue-500/10 dark:to-sky-500/10",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  },
  entertainment: {
    label: "娛樂",
    icon: "🎮",
    bg: "from-purple-50 to-pink-50 dark:from-purple-500/10 dark:to-pink-500/10",
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  },
  social: {
    label: "社交",
    icon: "🤝",
    bg: "from-orange-50 to-amber-50 dark:from-orange-500/10 dark:to-amber-500/10",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  },
};

export default function RoomCard({
  title,
  date,
  location,
  members,
  status,
  statusTone = "blue",
  icon = "⚡",
  category,
  detailHref,
  chatHref,
  unreadCount,
}: RoomCardProps) {
  const router = useRouter();
  const cat = category ? CATEGORY_CONFIG[category] : null;

  return (
    <article
      className="group flex items-center gap-4 rounded-3xl border border-zinc-200/70 bg-white/85 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/70 cursor-pointer"
      onClick={() => detailHref && router.push(detailHref)}
    >
      <div
        className={`flex h-20 w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-4xl ${cat ? cat.bg : "from-purple-50 to-blue-50 dark:from-purple-500/10 dark:to-blue-500/10"}`}
      >
        {cat ? cat.icon : null}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-lg font-bold text-zinc-950 dark:text-zinc-50">
          {title}
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
          {cat && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cat.badge}`}>
              {cat.icon} {cat.label}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z"
              />
            </svg>
            {date}
          </span>

          <span className="flex items-center gap-1.5">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 21s7-4.35 7-11a7 7 0 10-14 0c0 6.65 7 11 7 11z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10a2 2 0 100-4 2 2 0 000 4z"
              />
            </svg>
            {location}
          </span>
        </div>
      </div>

      <div className="hidden items-center gap-3 sm:flex">
        <span
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${statusClassMap[statusTone]}`}
        >
          {status}
        </span>

        <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-5.13a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          {members}
        </span>

        {chatHref && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push(chatHref);
            }}
            className="relative flex items-center justify-center w-9 h-9 rounded-full text-zinc-500 hover:bg-purple-50 hover:text-purple-600 dark:text-zinc-400 dark:hover:bg-purple-500/10 dark:hover:text-purple-400 transition-colors"
            title="群聊"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            {typeof unreadCount === "number" && unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] flex items-center justify-center text-[0.6rem] font-bold text-white bg-red-500 rounded-full px-0.5 leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        )}

        <span className="text-2xl text-zinc-300 transition group-hover:text-purple-500">
          ›
        </span>
      </div>
    </article>
  );
}
