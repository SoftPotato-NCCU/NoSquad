"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useDictionary, t } from "@/lib/i18n/useDictionary";
import { listRoomHall, joinRoom } from "@/lib/api";
import RoomCard from "@/components/rooms/RoomCard";
import type { HallRoom, Pagination } from "@/types/rooms";

function ExploreContent() {
  const { user, isLoading: authLoading } = useAuth();
  const { dict } = useDictionary("explore");
  const router = useRouter();

  const [rooms, setRooms] = useState<HallRoom[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRooms = async (cursor?: string) => {
    if (cursor) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await listRoomHall({
        limit: 20,
        cursor,
        include_joined: false,
        include_full: false,
      });
      if (cursor) {
        setRooms((prev) => [...prev, ...response.data.rooms]);
      } else {
        setRooms(response.data.rooms);
      }
      setPagination(response.data.pagination);
    } catch (e) {
      setError(e instanceof Error ? e.message : t(dict, "error", ""));
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRooms();
    }
  }, [user]);

  const handleLoadMore = () => {
    if (pagination?.next_cursor && !isLoadingMore) {
      fetchRooms(pagination.next_cursor);
    }
  };

  const handleJoin = async (roomId: string) => {
    try {
      await joinRoom(roomId);
      await fetchRooms();
    } catch (e) {
      setError(e instanceof Error ? e.message : t(dict, "networkError", "Failed to join room"));
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col flex-1 p-4">
        <div className="animate-pulse h-8 w-24 bg-zinc-200 rounded" />
      </div>
    );
  }

  if (!user) {
    router.push("/");
    return null;
  }

  return (
    <div className="flex flex-col flex-1 p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">
          {t(dict, "roomHall", "Room Hall")}
        </h1>
        <button
          onClick={() => router.push("/")}
          className="text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors"
        >
          + {t(dict, "createRoom", "Create Room")}
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={() => fetchRooms()}
            className="text-primary hover:underline"
          >
            {t(dict, "retry", "Retry")}
          </button>
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {t(dict, "noRooms", "No rooms available")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              variant="hall"
              onJoin={handleJoin}
            />
          ))}
        </div>
      )}

      {pagination?.has_next && (
        <div className="mt-4 text-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="text-sm text-primary hover:underline disabled:opacity-50"
          >
            {isLoadingMore ? t(dict, "loading", "Loading...") : t(dict, "loadMore", "Load More")}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col flex-1 p-4">
          <div className="animate-pulse h-8 w-24 bg-zinc-200 rounded" />
        </div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}