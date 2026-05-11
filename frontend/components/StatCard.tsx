// 首頁統計數據卡

type StatCardProps = {
  label: string;
  value: string | number;
  tone?: "purple" | "blue" | "green";
  icon?: React.ReactNode;
};

const toneClassMap = {
  purple:
    "bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300",
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
  green:
    "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
};

export default function StatCard({
  label,
  value,
  tone = "purple",
  icon,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-white/80 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClassMap[tone]}`}
        >
          {icon ?? (
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
                d="M13 3L4 14h7l-1 7 9-11h-7l1-7z"
              />
            </svg>
          )}
        </div>

        <div>
          <p className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">
            {value}
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
        </div>
      </div>
    </div>
  );
}