"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useRooms } from "@/lib/rooms-context";
import { useDictionary, t } from "@/lib/i18n/useDictionary";
import { handleAuthError, joinRoom, listRoomHall } from "@/lib/api";
import type { HallRoom, RoomCategory, RoomSortField, SortOrder } from "@/types/rooms";
import ActivityCard from "@/components/ActivityCard";

function formatRoomDate(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function roomStatusLabel(
  dict: Record<string, unknown>,
  roomStatus: string,
  isPending: boolean,
  isApproved: boolean,
  isFull: boolean,
  joinApprovalRequired: boolean,
) {
  if (isPending) return t(dict, "explore.status.pending", "待審核");
  if (isApproved) return t(dict, "explore.status.approved", "已加入");
  if (isFull) return t(dict, "explore.status.full", "已滿");
  if (roomStatus === "recruiting_closed")
    return t(dict, "explore.status.recruitingClosed", "已停止招募");
  if (roomStatus === "in_progress")
    return t(dict, "explore.status.inProgress", "進行中");
  if (roomStatus === "ended")
    return t(dict, "explore.status.ended", "已結束");
  if (roomStatus === "cancelled")
    return t(dict, "explore.status.cancelled", "已取消");
  if (joinApprovalRequired)
    return t(dict, "explore.status.needsApproval", "需審核");
  return t(dict, "explore.status.joinable", "可加入");
}

function roomToActivity(
  room: HallRoom,
  isPending = false,
  isApproved = false,
  dict: Record<string, unknown>,
) {
  const isFull = room.is_full;

  const statusLabel = roomStatusLabel(
    dict,
    room.room_status,
    isPending,
    isApproved,
    isFull,
    room.join_approval_required,
  );

  return {
    title: room.name,
    time: formatRoomDate(room.created_at),
    location: room.description || t(dict, "explore.noDescription", "尚未提供活動說明"),
    members: `${room.member_count}/${room.max_capacity}`,
    status: statusLabel,
    statusTone: isPending
      ? ("orange" as const)
      : isApproved
        ? ("blue" as const)
        : isFull ||
            room.room_status === "recruiting_closed" ||
            room.room_status === "in_progress" ||
            room.room_status === "ended" ||
            room.room_status === "cancelled"
          ? ("orange" as const)
          : room.join_approval_required
            ? ("purple" as const)
            : ("green" as const),
    icon: "⚡",
    category: room.category,
  };
}

// Category chip keys. "all" clears the filter; the rest map 1:1 to the backend
// `category` enum (sports / study / entertainment / social).
const categoryKeys: (RoomCategory | "all")[] = [
  "all",
  "sports",
  "study",
  "entertainment",
  "social",
];

// Sort presets shown in the filter panel. Each maps to a backend
// `sort_by` + `order` pair.
const SORT_OPTIONS: {
  key: string;
  sort_by: RoomSortField;
  order: SortOrder;
}[] = [
  { key: "newest", sort_by: "created_at", order: "desc" },
  { key: "eventSoon", sort_by: "event_time", order: "asc" },
  { key: "mostMembers", sort_by: "member_count", order: "desc" },
];

function ExploreContent() {
  const { user, isLoading: authLoading } = useAuth();
  const { myRooms, fetchRooms } = useRooms();
  const { dict, isLoading } = useDictionary("explore");
  const router = useRouter();

  const [rooms, setRooms] = useState<HallRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<RoomCategory | "all">("all");
  const [sortKey, setSortKey] = useState(SORT_OPTIONS[0].key);
  const [includeFull, setIncludeFull] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [pendingRoomIds, setPendingRoomIds] = useState<Set<string>>(new Set());

  // Debounce the search box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(handle);
  }, [searchText]);

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

    const sort = SORT_OPTIONS.find((o) => o.key === sortKey) ?? SORT_OPTIONS[0];

    async function loadHallRooms() {
      try {
        setIsLoadingRooms(true);
        setRoomError(null);

        const response = await listRoomHall({
          include_joined: true,
          include_full: includeFull,
          category: selectedCategory === "all" ? undefined : selectedCategory,
          q: debouncedSearch.trim() || undefined,
          sort_by: sort.sort_by,
          order: sort.order,
        });

        if (mounted) {
          setRooms(response.data.rooms);
        }
      } catch (error) {
        if (handleAuthError(error)) return;

        if (mounted) {
          setRoomError(t(dict, "explore.loadError", "房間大廳載入失敗"));
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
  }, [user, dict, selectedCategory, debouncedSearch, sortKey, includeFull]);

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

  // Keyword search, category filter, and sorting are all applied server-side
  // (see the loadHallRooms effect). The only client-side trimming left is
  // hiding rooms the user owns, which the hall endpoint still returns.
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => !createdRoomIds.has(room.id));
  }, [rooms, createdRoomIds]);

  const handleJoinRoom = async (room: HallRoom) => {
    const isPending =
      pendingRoomIds.has(room.id) || pendingJoinedRoomIds.has(room.id);
    const isApproved = approvedJoinedRoomIds.has(room.id);

    if (
      room.room_status !== "open" ||
      room.is_full ||
      joiningRoomId ||
      isPending ||
      isApproved
    ) {
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
      setRoomError(t(dict, "explore.joinError", "加入房間失敗，請稍後再試"));
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
            aria-expanded={showFilters}
            onClick={() => setShowFilters((prev) => !prev)}
            className={`flex h-14 items-center justify-center gap-2 rounded-2xl border px-6 font-semibold shadow-sm transition ${
              showFilters
                ? "border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-500/40 dark:bg-purple-500/10 dark:text-purple-300"
                : "border-zinc-200/70 bg-white/85 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-200 dark:hover:bg-zinc-800"
            }`}
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

        {showFilters && (
          <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200/70 bg-white/85 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-3">
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                {t(dict, "explore.sort.label", "排序")}
              </span>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:ring-purple-500/20"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {t(dict, `explore.sort.${opt.key}`, opt.key)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              <input
                type="checkbox"
                checked={includeFull}
                onChange={(e) => setIncludeFull(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300"
              />
              {t(dict, "explore.filter.includeFull", "顯示已滿房間")}
            </label>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {categoryKeys.map((key) => {
            const isActive = selectedCategory === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={isActive}
                onClick={() => setSelectedCategory(key)}
                className={`rounded-full px-5 py-2 text-sm font-semibold shadow-sm transition ${
                  isActive
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-purple-500/20"
                    : "border border-zinc-200/70 bg-white/85 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                {t(dict, `explore.categories.${key}`, key)}
              </button>
            );
          })}
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
            {t(dict, "explore.loading", "房間大廳載入中...")}
          </div>
        )}

        {!isLoadingRooms && !roomError && filteredRooms.length === 0 && (
          <div className="rounded-3xl border border-zinc-200/70 bg-white/85 p-6 text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400 lg:col-span-2">
            {t(dict, "explore.noRoomsDisplay", "目前沒有可以顯示的房間。")}
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
                {...roomToActivity(room, isPending, isApproved, dict)}
                detailHref={`/rooms/room?room_id=${room.id}`}
                actionDisabled={
                  room.room_status !== "open" ||
                  isApproved ||
                  room.is_full ||
                  isPending ||
                  joiningRoomId === room.id
                }
                actionLabel={
                  joiningRoomId === room.id
                    ? t(dict, "explore.status.joining", "加入中...")
                    : roomStatusLabel(
                        dict,
                        room.room_status,
                        isPending,
                        isApproved,
                        room.is_full,
                        room.join_approval_required,
                      )
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