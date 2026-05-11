type ProfileInfoRowProps = {
  icon: React.ReactNode;
  label: string;
  value?: string;
  danger?: boolean;
  onClick?: () => void;
};

export default function ProfileInfoRow({
  icon,
  label,
  value,
  danger = false,
  onClick,
}: ProfileInfoRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-left transition ${
        danger
          ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
          : "text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800/70"
      }`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
          danger
            ? "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400"
            : "bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300"
        }`}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-semibold">{label}</p>
        {value && (
          <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">
            {value}
          </p>
        )}
      </div>

      {!danger && (
        <span className="text-xl text-zinc-300 dark:text-zinc-600">›</span>
      )}
    </button>
  );
}