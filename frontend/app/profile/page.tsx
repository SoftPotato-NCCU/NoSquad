"use client";

import { Suspense } from "react";
import { useAuth } from "@/lib/auth-context";
import { useDictionary, t } from "@/lib/i18n/useDictionary";
import { logout, clearToken } from "@/lib/api";

function ProfileContent() {
  const { user, isLoading: authLoading } = useAuth();
  const { dict, isLoading } = useDictionary("profile");

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
    window.location.href = "/auth/login";
    return null;
  }

  return (
    <div className="flex flex-col flex-1 p-4">
      <h1 className="text-xl font-semibold mb-6">
        {t(dict, "profile.profile.title", "Profile")}
      </h1>

      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-zinc-500">
            {t(dict, "profile.name", "Name")}
          </span>
          <span className="font-medium">{user.name}</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm text-zinc-500">
            {t(dict, "profile.username", "Username")}
          </span>
          <span className="font-medium">@{user.username}</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm text-zinc-500">
            {t(dict, "profile.email", "Email")}
          </span>
          <span className="font-medium">{user.email}</span>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="mt-8 w-full py-3 px-4 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-medium rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        {t(dict, "profile.logout", "Log Out")}
      </button>
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
