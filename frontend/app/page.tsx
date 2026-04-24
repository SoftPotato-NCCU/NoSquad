"use client";

import { Suspense } from "react";
import { useAuth } from "@/lib/auth-context";
import { useDictionary, t } from "@/lib/i18n/useDictionary";
import Link from "next/link";
import Image from "next/image";

function AuthenticatedHome() {
  const { dict } = useDictionary("home");

  return (
    <div className="flex flex-col flex-1 p-4">
      <h1 className="text-[clamp(1.25rem,1.6vw,2rem)] font-semibold mb-4">
        {t(dict, "home.home.title", "Home")}
      </h1>
      <p className="text-[clamp(0.95rem,1.1vw,1.25rem)] text-zinc-500">
        {t(dict, "home.home.myRooms", "My Rooms")}
      </p>
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
          {/* <p className="text-base sm:text-lg text-zinc-500 dark:text-zinc-400">
            {t(dict, "home.home.subtitle", "Organize your group activities")}
          </p> */}
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

  return <AuthenticatedHome />;
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex flex-col flex-1 items-center justify-center p-4">
      <div className="animate-spin w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full" />
    </div>}>
      <HomeContent />
    </Suspense>
  );
}
