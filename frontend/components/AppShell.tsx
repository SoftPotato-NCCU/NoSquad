"use client";

import { useAuth } from "@/lib/auth-context";
import BottomNav from "@/components/BottomNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1">
        {children}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col flex-1">
        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 pb-16">
      {children}
      <BottomNav />
    </div>
  );
}