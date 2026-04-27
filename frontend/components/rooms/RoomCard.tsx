"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDictionary, t } from "@/lib/i18n/useDictionary";
import type { MyRoom, HallRoom } from "@/types/rooms";

interface RoomCardProps {
  room: MyRoom | HallRoom;
  variant?: "my" | "hall";
  onJoin?: (roomId: string) => void;
  onLeave?: (roomId: string) => void;
}

export default function RoomCard({ room, variant = "my", onJoin, onLeave }: RoomCardProps) {
  const router = useRouter();
  const { dict } = useDictionary("common");
  const isMyRoom = variant === "my";
  const myRoom = isMyRoom ? room as MyRoom : null;
  const hallRoom = !isMyRoom ? room as HallRoom : null;

  const handleJoin = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onJoin) onJoin(room.id);
  };

  const handleLeave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onLeave) onLeave(room.id);
  };

  const handleClick = () => {
    router.push(`/rooms/room?room_id=${room.id}`);
  };

  const isFull = room.member_count >= room.max_capacity;
  const isOwner = isMyRoom && myRoom?.is_owner;
  const isPending = isMyRoom && myRoom?.membership_status === "pending";
  const isJoined = !isMyRoom && hallRoom?.is_joined;

  return (
    <div
      onClick={handleClick}
      className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:bg-card/80 transition-colors"
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate">{room.name}</h3>
          {room.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {room.description}
            </p>
          )}
        </div>
        {isOwner && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
            {t(dict, "owner", "Owner")}
          </span>
        )}
        {isPending && (
          <span className="text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded">
            {t(dict, "pending", "Pending")}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
        <span>
          {room.member_count}/{room.max_capacity} {t(dict, "members", "members")}
        </span>
        {room.join_approval_required && !isOwner && (
          <span className="text-xs">{t(dict, "approvalRequired", "Approval required")}</span>
        )}
      </div>

      {!isMyRoom && (
        <div className="mt-3 flex gap-2">
          {isJoined ? (
            <button
              onClick={handleLeave}
              className="text-sm text-destructive hover:underline"
            >
              {t(dict, "leave", "Leave")}
            </button>
          ) : (
            <button
              onClick={handleJoin}
              disabled={isFull}
              className="text-sm text-primary hover:underline disabled:opacity-50 disabled:no-underline"
            >
              {isFull ? t(dict, "full", "Full") : t(dict, "join", "Join")}
            </button>
          )}
          <Link
            href={`/rooms/room?room_id=${room.id}`}
            className="text-sm text-muted-foreground hover:underline ml-auto"
          >
            {t(dict, "view", "View")}
          </Link>
        </div>
      )}

      {isMyRoom && !isOwner && (
        <div className="mt-3">
          <Link
            href={`/rooms/room?room_id=${room.id}`}
            className="text-sm text-primary hover:underline"
          >
            {t(dict, "viewRoom", "View Room")}
          </Link>
        </div>
      )}
    </div>
  );
}