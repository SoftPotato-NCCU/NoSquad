interface PointBadgeProps {
  points: number;
  showThreshold?: boolean;
}

export function PointBadge({ points, showThreshold = false }: PointBadgeProps) {
  const color =
    points < 3
      ? 'text-red-500'
      : points < 8
        ? 'text-yellow-500'
        : 'text-green-600';

  return (
    <span className={`inline-flex items-center gap-1 font-medium ${color}`}>
      <span>{points}</span>
      <span className="text-xs opacity-70">pts</span>
      {showThreshold && points < 3 && (
        <span className="ml-1 text-xs rounded bg-red-100 px-1 py-0.5 text-red-700">
          Cannot join rooms
        </span>
      )}
      {showThreshold && points >= 3 && points < 8 && (
        <span className="ml-1 text-xs rounded bg-yellow-100 px-1 py-0.5 text-yellow-700">
          Cannot create rooms
        </span>
      )}
    </span>
  );
}
