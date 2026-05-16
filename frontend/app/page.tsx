"use client";

import { Suspense, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRooms } from "@/lib/rooms-context";
import { useDictionary, t, tpl } from "@/lib/i18n/useDictionary";
import type { MyRoom } from "@/types/rooms";
import Link from "next/link";
import Image from "next/image";
import RoomCard from "@/components/RoomCard";
import StatCard from "@/components/StatCard";

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

function roomToCard(room: MyRoom) {
  const isInactiveStatus =
    room.room_status === "recruiting_closed" ||
    room.room_status === "in_progress" ||
    room.room_status === "ended" ||
    room.room_status === "cancelled";

  return {
    title: room.name,
    date: formatRoomDate(room.event_time),
    location: room.description || "尚未提供活動說明",
    members: `${room.member_count}/${room.max_capacity}`,
    status:
      room.room_status === "recruiting_closed"
        ? "已停止招募"
        : room.room_status === "in_progress"
          ? "進行中"
          : room.room_status === "ended"
            ? "已結束"
            : room.room_status === "cancelled"
              ? "已取消"
              : room.is_owner
                ? "房主"
                : room.membership_status === "pending"
                  ? "待審核"
                  : "已加入",
    statusTone: isInactiveStatus
      ? ("orange" as const)
      : room.is_owner
        ? ("purple" as const)
        : room.membership_status === "pending"
          ? ("orange" as const)
          : ("blue" as const),
    icon: "⚡",
  };
}

function AuthenticatedHome({
  user,
}: {
  user: {
    name: string;
    username: string;
    email: string;
    phone: string;
  };
}) {
  const { dict } = useDictionary("home");
  const {
    myRooms,
    isLoading: isLoadingRooms,
    error: roomError,
    fetchRooms,
  } = useRooms();

  useEffect(() => {
    fetchRooms(true);
  }, [fetchRooms]);

  const createdRooms = myRooms.filter((room) => room.is_owner);
  const joinedRooms = myRooms.filter((room) => !room.is_owner);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 md:text-4xl">
          {t(dict, "home.home.title", "首頁")}
        </h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          {t(dict, "home.home.myRooms", "我的房間")}
        </p>
      </div>

      <section className="overflow-hidden rounded-3xl border border-zinc-200/70 bg-white/80 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-10">
          <div className="flex flex-col justify-center">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 md:text-4xl">
              {tpl(
                dict,
                "home.dashboard.welcomeTitle",
                { username: user.username },
                `歡迎回來，${user.username}！`,
              )}
            </h2>

            <p className="mt-4 max-w-xl leading-7 text-zinc-500 dark:text-zinc-400">
              {t(
                dict,
                "home.dashboard.welcomeDescription",
                "今天也一起找到志同道合的夥伴，創造屬於你們的精彩時刻吧！",
              )}
            </p>
          </div>

          <div className="grid w-full gap-4 sm:grid-cols-2 md:w-[34rem]">
            <StatCard
              label={t(dict, "home.dashboard.activeRooms", "進行中房間")}
              value={createdRooms.length}
              tone="purple"
              icon={
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
              }
            />

            <StatCard
              label={t(dict, "home.dashboard.joinedActivities", "參與活動")}
              value={joinedRooms.length}
              tone="blue"
              icon={
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.538 1.118l-2.8-2.034a1 1 0 00-1.176 0l-2.8 2.034c-.783.57-1.838-.197-1.538-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81H7.03a1 1 0 00.95-.69l1.07-3.292z" />
                </svg>
              }
            />
          </div>
        </div>
      </section>

      <section>
        {/* <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">
            {t(dict, "home.home.myRooms", "我的房間")}
          </h2>

          <button className="font-semibold text-purple-600 dark:text-purple-400">
            {t(dict, "home.dashboard.viewAll", "查看全部 ›")}
          </button>
        </div> */}

        <div className="space-y-8">
          {isLoadingRooms && (
            <div className="rounded-3xl border border-zinc-200/70 bg-white/85 p-6 text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400">
              {t(dict, "home.home.loadingRooms", "房間資料載入中...")}
            </div>
          )}

          {!isLoadingRooms && roomError && (
            <div className="rounded-3xl border border-red-200/70 bg-white/85 p-6 text-red-600 shadow-sm dark:border-red-900/60 dark:bg-zinc-900/70 dark:text-red-400">
              {roomError}
            </div>
          )}

          {!isLoadingRooms && !roomError && myRooms.length === 0 && (
            <div className="rounded-3xl border border-zinc-200/70 bg-white/85 p-6 text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400">
              {t(
                dict,
                "home.home.emptyAll",
                "你目前還沒有創建或加入任何房間。",
              )}
            </div>
          )}

          {!isLoadingRooms && !roomError && myRooms.length > 0 && (
            <>
              <div>
                <h3 className="mb-4 text-lg font-bold text-zinc-950 dark:text-zinc-50">
                  {t(dict, "home.home.myCreatedRooms", "我創建的房間")}
                </h3>

                <div className="space-y-4">
                  {createdRooms.length === 0 ? (
                    <div className="rounded-3xl border border-zinc-200/70 bg-white/85 p-6 text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400">
                      {t(
                        dict,
                        "home.home.emptyCreated",
                        "你目前還沒有創建房間。",
                      )}
                    </div>
                  ) : (
                    createdRooms.map((room) => (
                      <RoomCard
                        key={room.id}
                        {...roomToCard(room)}
                        detailHref={`/rooms/room?room_id=${room.id}`}
                      />
                    ))
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-4 text-lg font-bold text-zinc-950 dark:text-zinc-50">
                  {t(dict, "home.home.myJoinedRooms", "我加入的房間")}
                </h3>

                <div className="space-y-4">
                  {joinedRooms.length === 0 ? (
                    <div className="rounded-3xl border border-zinc-200/70 bg-white/85 p-6 text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400">
                      {t(
                        dict,
                        "home.home.emptyJoined",
                        "你目前還沒有加入其他房間。",
                      )}
                    </div>
                  ) : (
                    joinedRooms.map((room) => (
                      <RoomCard
                        key={room.id}
                        {...roomToCard(room)}
                        detailHref={`/rooms/room?room_id=${room.id}`}
                      />
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function UnauthenticatedHome({ dict }: { dict: Record<string, unknown> }) {
  return (
    <div className="flex flex-col flex-1 items-center justify-center p-4">
      <main className="flex flex-col items-center gap-6 sm:gap-8 max-w-[clamp(20rem,28vw,32rem)] w-full">
        <div className="flex flex-col items-center gap-3 sm:gap-4 text-center">
          <div className="relative w-[clamp(5rem,6vw,7rem)] h-[clamp(5rem,6vw,7rem)]">
            <Image
              src="/icon.svg"
              alt="NoSquad"
              fill
              className="object-contain"
              priority
            />
          </div>

          <h1 className="text-[clamp(2rem,2.8vw,4rem)] font-bold tracking-tight">
            NoSquad
          </h1>

          <p className="text-[clamp(0.95rem,1.1vw,1.25rem)] text-zinc-400 dark:text-zinc-500">
            {t(dict, "home.home.tagline", "Find and organize group activities")}
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Link
            href="/auth/login"
            className="flex items-center justify-center h-[clamp(3rem,3.2vw,3.75rem)] w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-full hover:opacity-90 transition-opacity text-[clamp(1rem,1.1vw,1.25rem)]"
          >
            {t(dict, "home.home.login", "Log In")}
          </Link>

          <Link
            href="/auth/signup"
            className="flex items-center justify-center h-[clamp(3rem,3.2vw,3.75rem)] w-full border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-[clamp(1rem,1.1vw,1.25rem)]"
          >
            {t(dict, "home.home.signup", "Sign Up")}
          </Link>
        </div>
      </main>
    </div>
  );
}

function HomeContent() {
  const { user, isLoading } = useAuth();
  const { dict, isLoading: dictLoading } = useDictionary("home");

  if (isLoading || dictLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <UnauthenticatedHome dict={dict} />;
  }

  return <AuthenticatedHome user={user} />;
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col flex-1 items-center justify-center p-4">
          <div className="animate-spin w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}