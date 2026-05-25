"use client";

import { useState, useRef, useEffect } from "react";
import { apiFetch } from "@/lib/api";

export default function NotificationSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastStatus, setLastStatus] = useState<"success" | "error" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleTestNotification = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<{ message: string; sent: number; failed: number }>(
        "/push/test",
        { method: "POST" }
      );

      console.log("[PUSH] Test notification sent:", data);
      setLastStatus("success");

      setTimeout(() => {
        setLastStatus(null);
        setIsOpen(false);
      }, 2000);
    } catch (error) {
      console.error("[PUSH] Failed to send test notification:", error);
      setLastStatus("error");

      setTimeout(() => {
        setLastStatus(null);
      }, 2000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-left transition text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800/70"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 17a3 3 0 006 0"
            />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-semibold">通知設定</p>
          <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">
            {lastStatus === "success"
              ? "✓ 已發送"
              : lastStatus === "error"
                ? "✗ 發送失敗"
                : "已開啟"}
          </p>
        </div>

        <span
          className={`text-xl transition-transform ${
            isOpen ? "rotate-90" : ""
          } text-zinc-300 dark:text-zinc-600`}
        >
          ›
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-zinc-200/70 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          <button
            type="button"
            onClick={handleTestNotification}
            disabled={isLoading}
            className="w-full px-4 py-3 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-50 first:rounded-t-2xl last:rounded-b-2xl disabled:opacity-50 disabled:cursor-not-allowed transition dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {isLoading ? "發送中..." : "📬 要求測試推播通知"}
          </button>
        </div>
      )}
    </div>
  );
}
