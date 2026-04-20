"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useDictionary, t } from "@/lib/i18n/useDictionary";

function ExploreContent() {
  const { user, isLoading: authLoading } = useAuth();
  const { dict, isLoading } = useDictionary("explore");
  const router = useRouter();

  if (authLoading || isLoading) {
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
      <h1 className="text-xl font-semibold mb-4">{t(dict, "explore.explore.title", "Explore")}</h1>
      <p className="text-zinc-500">{t(dict, "explore.explore.roomHall", "Room Hall")}</p>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="flex flex-col flex-1 p-4"><div className="animate-pulse h-8 w-24 bg-zinc-200 rounded" /></div>}>
      <ExploreContent />
    </Suspense>
  );
}