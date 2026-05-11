"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useRooms } from "@/lib/rooms-context";
import { useDictionary, t } from "@/lib/i18n/useDictionary";
import { logout, clearToken } from "@/lib/api";
import StatCard from "@/components/StatCard";
import ProfileInfoRow from "@/components/ProfileInfoRow";

function ProfileContent() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { dict, isLoading } = useDictionary("profile");
  const {
    myRooms,
    isLoading: isLoadingRooms,
    fetchRooms,
  } = useRooms();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    fetchRooms(true);
  }, [user, fetchRooms]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Ignore errors, just clear locally
    } finally {
      clearToken();
      localStorage.removeItem("user");
      window.location.href = "/";
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

  const currentUser = user;

  const displayName = currentUser.name || "User";
  const username = currentUser.username || "username";
  const email = currentUser.email || "user@example.com";
  const phone = currentUser.phone || "尚未提供";

  const createdRoomCount = myRooms.filter((room) => room.is_owner).length;
  const joinedRoomCount = myRooms.filter((room) => !room.is_owner).length;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 md:text-4xl">
          {t(dict, "profile.profile.title", "個人檔案")}
        </h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          {t(dict, "profile.profile.subtitle", "帳號與偏好設定")}
        </p>
      </div>

      <section className="overflow-hidden rounded-3xl border border-zinc-200/70 bg-white/80 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
        <div className="grid gap-6 p-6 md:grid-cols-[auto_1fr] md:p-10">
          <div className="flex justify-center md:block">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-600 text-4xl font-bold text-white shadow-xl shadow-purple-500/20">
              {displayName[0]?.toUpperCase() || "N"}
            </div>
          </div>

          <div className="flex flex-col justify-center text-center md:text-left">
            <p className="text-3xl font-bold text-zinc-950 dark:text-zinc-50">
              {displayName}
            </p>
            <p className="mt-1 text-purple-600 dark:text-purple-400">
              @{username}
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard
                label={t(dict, "profile.stats.joinedRooms", "加入房間")}
                value={isLoadingRooms ? 0 : joinedRoomCount}
                tone="purple"
              />
              <StatCard
                label={t(dict, "profile.stats.createdRooms", "建立房間")}
                value={isLoadingRooms ? 0 : createdRoomCount}
                tone="blue"
              />
              <StatCard
                label={t(dict, "profile.stats.friends", "好友")}
                value={0}
                tone="green"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-zinc-200/70 bg-white/85 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
          <div className="mb-3 px-2">
            <h2 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">
              {t(dict, "profile.sections.account", "帳號資訊")}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {t(
                dict,
                "profile.sections.accountDescription",
                "管理你的基本帳號資料",
              )}
            </p>
          </div>

          <div className="space-y-1">
            <ProfileInfoRow
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16v12H4z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7l8 6 8-6" />
                </svg>
              }
              label={t(dict, "profile.email", "電子郵件")}
              value={email}
            />

            <ProfileInfoRow
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h2l2 5-2 1a11 11 0 005 5l1-2 5 2v2a2 2 0 01-2 2h-1C8.373 18 3 12.627 3 6V5z" />
                </svg>
              }
              label={t(dict, "profile.phone", "電話號碼")}
              value={phone}
            />

            <ProfileInfoRow
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M3 11l8.5 8.5a2 2 0 002.8 0l5.2-5.2a2 2 0 000-2.8L11 3H3v8z" />
                </svg>
              }
              label={t(dict, "profile.preferences", "偏好類別")}
              value="尚未設定"
            />
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200/70 bg-white/85 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
          <div className="mb-3 px-2">
            <h2 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">
              {t(dict, "profile.sections.settings", "快速設定")}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {t(
                dict,
                "profile.sections.settingsDescription",
                "調整你的使用偏好",
              )}
            </p>
          </div>

          <div className="space-y-1">
            <ProfileInfoRow
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3a9 9 0 100 18 9 9 0 000-18z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
                </svg>
              }
              label={t(dict, "profile.settings.language", "語言設定")}
              value="繁體中文"
            />

            <ProfileInfoRow
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.36 6.36l-1.42-1.42M7.06 7.06L5.64 5.64m12.72 0l-1.42 1.42M7.06 16.94l-1.42 1.42M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              }
              label={t(dict, "profile.settings.theme", "主題設定")}
              value="跟隨系統"
            />

            <ProfileInfoRow
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a3 3 0 006 0" />
                </svg>
              }
              label={t(dict, "profile.settings.notifications", "通知設定")}
              value="已開啟"
            />

            <ProfileInfoRow
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10a4 4 0 118 0c0 2-2 2.5-3 4" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01" />
                </svg>
              }
              label={t(dict, "profile.settings.help", "幫助中心")}
            />
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-red-200/70 bg-white/85 p-3 shadow-sm dark:border-red-900/60 dark:bg-zinc-900/70">
        <ProfileInfoRow
          danger
          onClick={handleLogout}
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H9" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 4H6a2 2 0 00-2 2v12a2 2 0 002 2h7" />
            </svg>
          }
          label={t(dict, "profile.logout", "登出帳號")}
        />
      </section>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col flex-1 p-4">
          <div className="animate-pulse h-8 w-24 bg-zinc-200 rounded" />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}