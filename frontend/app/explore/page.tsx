"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useRooms } from "@/lib/rooms-context";
import { useDictionary, t } from "@/lib/i18n/useDictionary";
import { handleAuthError, joinRoom, listRoomHall } from "@/lib/api";
import type { HallRoom } from "@/types/rooms";
import ActivityCard from "@/components/ActivityCard";

const categories = ["全部", "運動", "學習", "娛樂", "社交"];

function formatRoomDate(value: string | null) {
  if (!value) return "時間尚未設定";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "時間尚未設定";
  }

  return date.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function roomToActivity(
  room: HallRoom,
  isPending = false,
  isApproved = false,
) {
  const isFull = room.is_full;

  return {
    title: room.name,
    time: formatRoomDate(room.created_at),
    location: room.description || "尚未提供活動說明",
    members: `${room.member_count}/${room.max_capacity}`,
    status: isPending
      ? "待審核"
      : isApproved
        ? "已加入"
        : isFull
          ? "已滿"
          : room.join_approval_required
            ? "需審核"
            : "可加入",
    statusTone: isPending
      ? ("orange" as const)
      : isApproved
        ? ("blue" as const)
        : isFull
          ? ("orange" as const)
          : room.join_approval_required
            ? ("purple" as const)
            : ("green" as const),
    icon: "⚡",
  };
}

function ExploreContent() {
  const { user, isLoading: authLoading } = useAuth();
  const { myRooms, fetchRooms } = useRooms();
  const { dict, isLoading } = useDictionary("explore");
  const router = useRouter();

  const [rooms, setRooms] = useState<HallRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [pendingRoomIds, setPendingRoomIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    fetchRooms(true);
  }, [user, fetchRooms]);

  useEffect(() => {
    if (!user) return;

    let mounted = true;

    async function loadHallRooms() {
      try {
        setIsLoadingRooms(true);
        setRoomError(null);

        const response = await listRoomHall({
          include_joined: true,
          include_full: true,
        });

        if (mounted) {
          setRooms(response.data.rooms);
        }
      } catch (error) {
        if (handleAuthError(error)) return;

        if (mounted) {
          setRoomError("房間大廳載入失敗");
        }
      } finally {
        if (mounted) {
          setIsLoadingRooms(false);
        }
      }
    }

    loadHallRooms();

    return () => {
      mounted = false;
    };
  }, [user]);

  const createdRoomIds = useMemo(() => {
    return new Set(
      myRooms.filter((room) => room.is_owner).map((room) => room.id),
    );
  }, [myRooms]);

  const pendingJoinedRoomIds = useMemo(() => {
    return new Set(
      myRooms
        .filter(
          (room) => !room.is_owner && room.membership_status === "pending",
        )
        .map((room) => room.id),
    );
  }, [myRooms]);

  const approvedJoinedRoomIds = useMemo(() => {
    return new Set(
      myRooms
        .filter(
          (room) => !room.is_owner && room.membership_status === "approved",
        )
        .map((room) => room.id),
    );
  }, [myRooms]);

  const visibleRooms = useMemo(() => {
    return rooms.filter((room) => !createdRoomIds.has(room.id));
  }, [rooms, createdRoomIds]);

  const filteredRooms = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) return visibleRooms;

    return visibleRooms.filter((room) => {
      return (
        room.name.toLowerCase().includes(keyword) ||
        room.description?.toLowerCase().includes(keyword)
      );
    });
  }, [visibleRooms, searchText]);

  const handleJoinRoom = async (room: HallRoom) => {
    const isPending =
      pendingRoomIds.has(room.id) || pendingJoinedRoomIds.has(room.id);
    const isApproved = approvedJoinedRoomIds.has(room.id);

    if (room.is_full || joiningRoomId || isPending || isApproved) {
      return;
    }

    try {
      setJoiningRoomId(room.id);
      setRoomError(null);

      const response = await joinRoom(room.id);

      if (response.data.status === "pending") {
        setPendingRoomIds((prev) => {
          const next = new Set(prev);
          next.add(room.id);
          return next;
        });

        await fetchRooms(true);
        return;
      }

      setRooms((prev) =>
        prev.map((item) =>
          item.id === room.id
            ? {
                ...item,
                is_joined: true,
                member_count: item.member_count + 1,
              }
            : item,
        ),
      );

      setPendingRoomIds((prev) => {
        const next = new Set(prev);
        next.delete(room.id);
        return next;
      });

      await fetchRooms(true);
    } catch (error) {
      if (handleAuthError(error)) return;
      setRoomError("加入房間失敗，請稍後再試");
    } finally {
      setJoiningRoomId(null);
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

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 md:text-4xl">
          {t(dict, "explore.explore.title", "探索")}
        </h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          {t(dict, "explore.explore.subtitle", "尋找適合你的活動")}
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="flex h-14 flex-1 items-center gap-3 rounded-2xl border border-zinc-200/70 bg-white/85 px-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
            <svg
              className="h-5 w-5 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={t(
                dict,
                "explore.search.placeholder",
                "搜尋活動、地點或關鍵字",
              )}
              className="w-full bg-transparent text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
            />
          </div>

          <button
            type="button"
            className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-zinc-200/70 bg-white/85 px-6 font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
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
                d="M3 4h18M6 12h12M10 20h4"
              />
            </svg>
            {t(dict, "explore.search.filter", "篩選")}
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          {categories.map((category, index) => (
            <button
              key={category}
              type="button"
              className={`rounded-full px-5 py-2 text-sm font-semibold shadow-sm transition ${
                index === 0
                  ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-purple-500/20"
                  : "border border-zinc-200/70 bg-white/85 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      {roomError && (
        <div className="rounded-3xl border border-red-200/70 bg-white/85 p-6 text-red-600 shadow-sm dark:border-red-900/60 dark:bg-zinc-900/70 dark:text-red-400">
          {roomError}
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        {isLoadingRooms && (
          <div className="rounded-3xl border border-zinc-200/70 bg-white/85 p-6 text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400 lg:col-span-2">
            房間大廳載入中...
          </div>
        )}

        {!isLoadingRooms && !roomError && filteredRooms.length === 0 && (
          <div className="rounded-3xl border border-zinc-200/70 bg-white/85 p-6 text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400 lg:col-span-2">
            目前沒有可以顯示的房間。
          </div>
        )}

        {!isLoadingRooms &&
          filteredRooms.map((room) => {
            const isPending =
              pendingRoomIds.has(room.id) || pendingJoinedRoomIds.has(room.id);
            const isApproved = approvedJoinedRoomIds.has(room.id);

            return (
              <ActivityCard
                key={room.id}
                {...roomToActivity(room, isPending, isApproved)}
                detailHref={`/rooms/room?room_id=${room.id}`}
                actionDisabled={
                  isApproved ||
                  room.is_full ||
                  isPending ||
                  joiningRoomId === room.id
                }
                actionLabel={
                  joiningRoomId === room.id
                    ? "加入中..."
                    : isPending
                      ? "待審核"
                      : isApproved
                        ? "已加入"
                        : room.is_full
                          ? "已滿"
                          : "加入"
                }
                onActionClick={() => handleJoinRoom(room)}
              />
            );
          })}
      </section>
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