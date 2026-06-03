"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useRooms } from "@/lib/rooms-context";
import { getMe } from "@/lib/api";
import { useDictionary, t, tpl } from "@/lib/i18n/useDictionary";
import type { RoomCategory } from "@/types/rooms";

const CATEGORY_OPTIONS: { value: RoomCategory; labelKey: string }[] = [
  { value: "sports", labelKey: "category.sports" },
  { value: "study", labelKey: "category.study" },
  { value: "entertainment", labelKey: "category.entertainment" },
  { value: "social", labelKey: "category.social" },
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
  const { dict } = useDictionary("rooms");

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
  const [creditScore, setCreditScore] = useState<number | null>(null);

  useEffect(() => {
    getMe().then((res) => setCreditScore(res.data.user.credit_score)).catch(() => {});
  }, []);

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
      setError(t(dict, "rooms.create.errors.nameRequired", "Please enter a room name"));
      return;
    }

    if (!formData.description.trim()) {
      setError(t(dict, "rooms.create.errors.descriptionRequired", "Please enter a room description"));
      return;
    }

    if (!formData.eventTime) {
      setError(t(dict, "rooms.create.errors.eventTimeRequired", "Please choose an activity time"));
      return;
    }

    const eventDate = new Date(formData.eventTime);

    if (Number.isNaN(eventDate.getTime())) {
      setError(t(dict, "rooms.create.errors.eventTimeInvalid", "Activity time format is invalid"));
      return;
    }

    if (formData.maxCapacity < 1) {
      setError(t(dict, "rooms.create.errors.capacityMin", "Capacity must be at least 1"));
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
      const apiMsg =
        error != null &&
        typeof error === "object" &&
        "error" in error &&
        typeof (error as { error: { message?: string } }).error?.message === "string"
          ? (error as { error: { message: string } }).error.message
          : null;
      setError(apiMsg ?? t(dict, "rooms.create.errors.createFailed", "Failed to create room, please try again"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 md:text-4xl">
          {t(dict, "rooms.create.title", "Create Room")}
        </h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          {t(dict, "rooms.create.subtitle", "Set activity details and find people to join you.")}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-zinc-200/70 bg-white/85 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 md:p-8"
      >
        {creditScore !== null && creditScore < 8 && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 dark:border-red-900/60 dark:bg-red-500/10 dark:text-red-400">
            {tpl(dict, "rooms.create.creditWarning", { score: String(creditScore) }, `Insufficient credit score (${creditScore}/10). You need at least 8 points to host a room.`)}
          </div>
        )}

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
              {t(dict, "rooms.create.fields.name", "Room Name")}
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder={t(dict, "rooms.create.placeholders.name", "Example: Weekend badminton group")}
              className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:ring-purple-500/20"
            />
          </div>

          <div>
            <label
              htmlFor="category"
              className="mb-2 block font-semibold text-zinc-800 dark:text-zinc-200"
            >
              {t(dict, "rooms.create.fields.category", "Activity Category")}
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
                  {t(dict, opt.labelKey, opt.value)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="maxCapacity"
              className="mb-2 block font-semibold text-zinc-800 dark:text-zinc-200"
            >
              {t(dict, "rooms.create.fields.maxCapacity", "Capacity")}
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
              {t(dict, "rooms.create.fields.eventTime", "Activity Time")}
            </label>
            <div className="overflow-hidden rounded-2xl">
              <input
                id="eventTime"
                name="eventTime"
                type="datetime-local"
                value={formData.eventTime}
                onChange={handleChange}
                className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:ring-purple-500/20"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="location"
              className="mb-2 block font-semibold text-zinc-800 dark:text-zinc-200"
            >
              {t(dict, "rooms.create.fields.location", "Activity Location")}
            </label>
            <input
              id="location"
              name="location"
              type="text"
              value={formData.location}
              onChange={handleChange}
              placeholder={t(dict, "rooms.create.placeholders.location", "Example: Community sports center")}
              className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:ring-purple-500/20"
            />
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="description"
              className="mb-2 block font-semibold text-zinc-800 dark:text-zinc-200"
            >
              {t(dict, "rooms.create.fields.description", "Room Description")}
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              placeholder={t(dict, "rooms.create.placeholders.description", "Briefly describe the activity, meeting point, and notes.")}
              className="w-full resize-none rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:ring-purple-500/20"
            />
          </div>

          <div className="md:col-span-2">
            <p className="mb-3 font-semibold text-zinc-800 dark:text-zinc-200">
              {t(dict, "rooms.create.fields.approvalMode", "Join Approval")}
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
                    {t(dict, "rooms.create.approval.manual", "Manual Approval")}
                  </span>
                  <span className="mt-1 block text-sm text-zinc-500 dark:text-zinc-400">
                    {t(dict, "rooms.create.approval.manualDescription", "Members must be approved by the host before joining.")}
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
                    {t(dict, "rooms.create.approval.auto", "Auto Join")}
                  </span>
                  <span className="mt-1 block text-sm text-zinc-500 dark:text-zinc-400">
                    {t(dict, "rooms.create.approval.autoDescription", "Users can join directly while the room has space.")}
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
            {t(dict, "rooms.create.cancel", "Cancel")}
          </button>

          <button
            type={creditScore !== null && creditScore < 8 ? "button" : "submit"}
            disabled={isSubmitting}
            onClick={
              creditScore !== null && creditScore < 8
                ? () => alert(tpl(dict, "rooms.create.creditWarningAlert", { score: String(creditScore) }, `Insufficient credit score (${creditScore}/10). You need at least 8 points to host a room.`))
                : undefined
            }
            className="h-12 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? t(dict, "rooms.create.submitting", "Creating...")
              : t(dict, "rooms.create.submit", "Create Room")}
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
