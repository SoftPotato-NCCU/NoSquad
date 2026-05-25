"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useRooms } from "@/lib/rooms-context";
import type { RoomCategory } from "@/types/rooms";

const CATEGORY_OPTIONS: { value: RoomCategory; label: string }[] = [
  { value: "sports", label: "運動" },
  { value: "study", label: "學習" },
  { value: "entertainment", label: "娛樂" },
  { value: "social", label: "社交" },
];

type CreateRoomFormData = {
  name: string;
  category: RoomCategory;
  description: string;
  location: string;
  eventTime: string;
  maxCapacity: number;
  approvalMode: "auto" | "manual";
};

function CreateRoomContent() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { createRoom } = useRooms();

  const [formData, setFormData] = useState<CreateRoomFormData>({
    name: "",
    category: "sports",
    description: "",
    location: "",
    eventTime: "",
    maxCapacity: 6,
    approvalMode: "manual",
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name === "maxCapacity" ? Number(value) : value,
    }));

    setError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError("請輸入房間名稱");
      return;
    }

    if (!formData.description.trim()) {
      setError("請輸入房間說明");
      return;
    }

    if (!formData.eventTime) {
      setError("請選擇活動時間");
      return;
    }

    const eventDate = new Date(formData.eventTime);

    if (Number.isNaN(eventDate.getTime())) {
      setError("活動時間格式不正確");
      return;
    }

    if (formData.maxCapacity < 1) {
      setError("人數上限至少要 1 人");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      await createRoom({
        name: formData.name.trim(),
        description: formData.description.trim(),
        max_capacity: formData.maxCapacity,
        join_approval_required: formData.approvalMode === "manual",
        event_time: eventDate.toISOString(),
        location: formData.location.trim() || undefined,
        category: formData.category,
      });

      router.push("/");
    } catch (error) {
      console.error("Create room failed:", error);
      setError("建立房間失敗，請稍後再試");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 md:text-4xl">
          建立房間
        </h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          設定活動資訊，找到適合一起參與的人。
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-zinc-200/70 bg-white/85 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 md:p-8"
      >
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-600 dark:border-red-900/60 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <label
              htmlFor="name"
              className="mb-2 block font-semibold text-zinc-800 dark:text-zinc-200"
            >
              房間名稱
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="例如：羽球揪團・週末揮拍！"
              className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:ring-purple-500/20"
            />
          </div>

          <div>
            <label
              htmlFor="category"
              className="mb-2 block font-semibold text-zinc-800 dark:text-zinc-200"
            >
              活動類別
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:ring-purple-500/20"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="maxCapacity"
              className="mb-2 block font-semibold text-zinc-800 dark:text-zinc-200"
            >
              人數上限
            </label>
            <input
              id="maxCapacity"
              name="maxCapacity"
              type="number"
              min={1}
              max={50}
              value={formData.maxCapacity}
              onChange={handleChange}
              className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:ring-purple-500/20"
            />
          </div>

          <div>
            <label
              htmlFor="eventTime"
              className="mb-2 block font-semibold text-zinc-800 dark:text-zinc-200"
            >
              活動時間
            </label>
            <input
              id="eventTime"
              name="eventTime"
              type="datetime-local"
              value={formData.eventTime}
              onChange={handleChange}
              className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:ring-purple-500/20"
            />
          </div>

          <div>
            <label
              htmlFor="location"
              className="mb-2 block font-semibold text-zinc-800 dark:text-zinc-200"
            >
              活動地點
            </label>
            <input
              id="location"
              name="location"
              type="text"
              value={formData.location}
              onChange={handleChange}
              placeholder="例如：新北市中和國民運動中心"
              className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:ring-purple-500/20"
            />
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="description"
              className="mb-2 block font-semibold text-zinc-800 dark:text-zinc-200"
            >
              房間說明
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              placeholder="簡單說明活動內容、集合方式、注意事項等。"
              className="w-full resize-none rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:ring-purple-500/20"
            />
          </div>

          <div className="md:col-span-2">
            <p className="mb-3 font-semibold text-zinc-800 dark:text-zinc-200">
              加入審核方式
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700/70">
                <input
                  type="radio"
                  name="approvalMode"
                  value="manual"
                  checked={formData.approvalMode === "manual"}
                  onChange={handleChange}
                  className="mt-1"
                />
                <span>
                  <span className="block font-semibold text-zinc-900 dark:text-white">
                    手動審核
                  </span>
                  <span className="mt-1 block text-sm text-zinc-500 dark:text-zinc-400">
                    成員申請後，需要房主同意才可加入。
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700/70">
                <input
                  type="radio"
                  name="approvalMode"
                  value="auto"
                  checked={formData.approvalMode === "auto"}
                  onChange={handleChange}
                  className="mt-1"
                />
                <span>
                  <span className="block font-semibold text-zinc-900 dark:text-white">
                    自動加入
                  </span>
                  <span className="mt-1 block text-sm text-zinc-500 dark:text-zinc-400">
                    只要房間未滿，使用者可以直接加入。
                  </span>
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="h-12 rounded-2xl border border-zinc-200 px-6 font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            取消
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-12 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "建立中..." : "建立房間"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CreateRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <CreateRoomContent />
    </Suspense>
  );
}