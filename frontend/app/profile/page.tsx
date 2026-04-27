"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDictionary, t } from "@/lib/i18n/useDictionary";
import { logout, clearToken, getMe } from "@/lib/api";
import SettingsMenu from "@/components/SettingsMenu";

interface UserData {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
}

function ProfileContent() {
  const { dict, isLoading: dictLoading } = useDictionary("profile");
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await getMe();
        setUser(response.data.user);
      } catch {
        clearToken();
        localStorage.removeItem("user");
        router.push("/auth/login");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [router]);

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

  if (isLoading || dictLoading) {
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
    <div className="flex flex-col flex-1 p-4">
      <SettingsMenu />
      <h1 className="text-xl font-semibold mb-6">
        {t(dict, "title", "Profile")}
      </h1>

      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-zinc-500">
            {t(dict, "name", "Name")}
          </span>
          <span className="font-medium">{user.name}</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm text-zinc-500">
            {t(dict, "username", "Username")}
          </span>
          <span className="font-medium">@{user.username}</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm text-zinc-500">
            {t(dict, "email", "Email")}
          </span>
          <span className="font-medium">{user.email}</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm text-zinc-500">
            {t(dict, "phone", "Phone")}
          </span>
          <span className="font-medium">{user.phone}</span>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="mt-8 w-full py-3 px-4 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-medium rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        {t(dict, "logout", "Log Out")}
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