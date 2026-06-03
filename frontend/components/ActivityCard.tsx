import Link from "next/link";
import type { RoomCategory } from "@/types/rooms";
import { useDictionary, t } from "@/lib/i18n/useDictionary";

// Card layout used by the explore page.

type ActivityCardProps = {
  title: string;
  time: string;
  location: string;
  members: string;
  status: string;
  statusTone?: "blue" | "green" | "purple" | "orange";
  icon?: string;
  category?: RoomCategory | null;
  detailHref?: string;
  actionLabel?: string;
  actionDisabled?: boolean;
  onActionClick?: () => void;
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
  { labelKey: string; icon: string; bg: string; badge: string }
> = {
  sports: {
    labelKey: "category.sports",
    icon: "🏃",
    bg: "from-green-50 to-emerald-50 dark:from-green-500/10 dark:to-emerald-500/10",
    badge: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  },
  study: {
    labelKey: "category.study",
    icon: "📚",
    bg: "from-blue-50 to-sky-50 dark:from-blue-500/10 dark:to-sky-500/10",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  },
  entertainment: {
    labelKey: "category.entertainment",
    icon: "🎮",
    bg: "from-purple-50 to-pink-50 dark:from-purple-500/10 dark:to-pink-500/10",
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  },
  social: {
    labelKey: "category.social",
    icon: "🤝",
    bg: "from-orange-50 to-amber-50 dark:from-orange-500/10 dark:to-amber-500/10",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  },
};

export default function ActivityCard({
  title,
  time,
  location,
  members,
  status,
  statusTone = "green",
  icon = "⚡",
  category,
  detailHref,
  actionLabel,
  actionDisabled = false,
  onActionClick,
}: ActivityCardProps) {
  const cat = category ? CATEGORY_CONFIG[category] : null;
  const { dict } = useDictionary("common");
  const resolvedActionLabel = actionLabel ?? t(dict, "join", "Join");

  return (
    <article className="flex gap-4 rounded-3xl border border-zinc-200/70 bg-white/85 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/70">
      <div
        className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-4xl ${cat ? cat.bg : "from-purple-50 to-blue-50 dark:from-purple-500/10 dark:to-blue-500/10"}`}
      >
        {cat ? cat.icon : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-zinc-950 dark:text-zinc-50">
              {title}
            </h3>
            {cat && (
              <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cat.badge}`}>
                {cat.icon} {t(dict, cat.labelKey, category ?? "")}
              </span>
            )}
          </div>

          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusClassMap[statusTone]}`}
          >
            {status}
          </span>
        </div>

        <div className="mt-3 space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
          <p className="flex items-center gap-2">
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
            {time}
          </p>

          <p className="flex items-center gap-2">
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
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
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

          <div className="flex items-center gap-2">
            {detailHref && (
              <Link
                href={detailHref}
                className="rounded-full border border-zinc-200 px-5 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {t(dict, "view", "View")}
              </Link>
            )}

            <button
              type="button"
              disabled={actionDisabled}
              onClick={onActionClick}
              className="rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-purple-500/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resolvedActionLabel}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
