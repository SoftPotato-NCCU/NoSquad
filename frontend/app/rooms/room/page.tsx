"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  getRoomDetails,
  joinRoom,
  leaveRoom,
  dismissRoom,
  listRoomMembers,
  listJoinRequests,
  approveRequest,
  rejectRequest,
  approveAllRequests,
  removeMember,
  closeRecruiting,
  openRecruiting,
} from "@/lib/api";
import type { RoomDetails, RoomMember, JoinRequest } from "@/types/rooms";

function formatDate(value: string | null) {
  if (!value) return "尚未設定";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "尚未設定";
  }

  return date.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRoomStatusLabel(status: RoomDetails["room_status"]) {
  switch (status) {
    case "open":
      return "招募中";
    case "recruiting_closed":
      return "已停止招募";
    case "in_progress":
      return "進行中";
    case "ended":
      return "已結束";
    case "cancelled":
      return "已取消";
    default:
      return "未知狀態";
  }
}

function getJoinButtonText(
  room: RoomDetails,
  isFull: boolean,
  isActionLoading: boolean,
) {
  if (isActionLoading) return "加入中...";
  if (isFull) return "房間已滿";

  switch (room.room_status) {
    case "open":
      return room.join_approval_required ? "申請加入" : "加入房間";
    case "recruiting_closed":
      return "已停止招募";
    case "in_progress":
      return "活動進行中";
    case "ended":
      return "活動已結束";
    case "cancelled":
      return "房間已取消";
    default:
      return "無法加入";
  }
}

function RoomDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const roomId = searchParams.get("room_id");

  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"members" | "requests">("members");
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchRoomData = async () => {
    if (!roomId) {
      setError("找不到房間 ID");
      setIsLoading(false);
      return;
    }

    try {
      setError(null);

      const roomRes = await getRoomDetails(roomId);
      const roomData = roomRes.data.room;

      setRoom(roomData);

      const canViewMembers =
        roomData.is_owner || roomData.membership_status === "approved";

      if (canViewMembers) {
        const membersRes = await listRoomMembers(roomId);
        setMembers(membersRes.data.members);
      } else {
        setMembers([]);
      }

      if (roomData.is_owner) {
        const requestsRes = await listJoinRequests(roomId);

        setRequests(
          requestsRes.data.requests.filter(
            (request) => request.user_id !== user?.id,
          ),
        );
      } else {
        setRequests([]);
      }
    } catch (e) {
      console.error("Failed to load room:", e);
      setError(e instanceof Error ? e.message : "Failed to load room");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && roomId) {
      fetchRoomData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, roomId]);

  const handleJoin = async () => {
    if (!roomId) return;

    setIsActionLoading(true);
    try {
      await joinRoom(roomId);
      await fetchRoomData();
    } catch (e) {
      console.error("Failed to join room:", e);
      setError(e instanceof Error ? e.message : "Failed to join room");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!roomId) return;

    setIsActionLoading(true);
    try {
      await leaveRoom(roomId);
      router.push("/");
    } catch (e) {
      console.error("Failed to leave room:", e);
      setError(e instanceof Error ? e.message : "Failed to leave room");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDismiss = async () => {
    if (!roomId) return;
    if (!confirm("確定要解散這個房間嗎？")) return;

    setIsActionLoading(true);
    try {
      await dismissRoom(roomId);
      router.push("/");
    } catch (e) {
      console.error("Failed to dismiss room:", e);
      setError(e instanceof Error ? e.message : "Failed to dismiss room");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCloseRecruiting = async () => {
    if (!roomId) return;

    setIsActionLoading(true);
    try {
      await closeRecruiting(roomId);
      await fetchRoomData();
    } catch (e) {
      console.error("Failed to close recruiting:", e);
      setError(e instanceof Error ? e.message : "停止招募失敗");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleOpenRecruiting = async () => {
    if (!roomId) return;

    setIsActionLoading(true);
    try {
      await openRecruiting(roomId);
      await fetchRoomData();
    } catch (e) {
      console.error("Failed to open recruiting:", e);
      setError(e instanceof Error ? e.message : "恢復招募失敗");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    if (!roomId) return;

    setIsActionLoading(true);
    try {
      await approveRequest(roomId, userId);
      await fetchRoomData();
    } catch (e) {
      console.error("Failed to approve request:", e);
      setError(e instanceof Error ? e.message : "Failed to approve request");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async (userId: string) => {
    if (!roomId) return;

    setIsActionLoading(true);
    try {
      await rejectRequest(roomId, userId);
      await fetchRoomData();
    } catch (e) {
      console.error("Failed to reject request:", e);
      setError(e instanceof Error ? e.message : "Failed to reject request");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleApproveAll = async () => {
    if (!roomId) return;

    setIsActionLoading(true);
    try {
      await approveAllRequests(roomId);
      await fetchRoomData();
    } catch (e) {
      console.error("Failed to approve requests:", e);
      setError(e instanceof Error ? e.message : "Failed to approve requests");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!roomId) return;
    if (!confirm("確定要移除此成員嗎？")) return;

    setIsActionLoading(true);
    try {
      await removeMember(roomId, userId);
      await fetchRoomData();
    } catch (e) {
      console.error("Failed to remove member:", e);
      setError(e instanceof Error ? e.message : "Failed to remove member");
    } finally {
      setIsActionLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="h-10 w-32 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-64 animate-pulse rounded-3xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  if (!user) {
    router.push("/");
    return null;
  }

  if (error && !room) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="w-fit rounded-full border border-zinc-200 bg-white/85 px-5 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          ← 返回
        </button>

        <div className="rounded-3xl border border-red-200/70 bg-white/85 p-6 text-red-600 shadow-sm dark:border-red-900/60 dark:bg-zinc-900/70 dark:text-red-400">
          {error}
        </div>
      </div>
    );
  }

  if (!room) return null;

  const isFull = room.member_count >= room.max_capacity;
  const isPending = !room.is_owner && room.membership_status === "pending";
  const canJoin =
    room.room_status === "open" &&
    !room.is_member &&
    !isPending &&
    !isFull;

  const canViewMembers =
    room.is_owner || room.membership_status === "approved";

  const owner = members.find((member) => member.is_owner);
  const approvedMembersFromApi = members.filter(
    (member) => member.approval_status === "approved",
  );

  const ownerFallback: RoomMember | null =
    room.is_owner && user
      ? {
          user_id: user.id,
          name: user.name,
          username: user.username,
          approval_status: "approved",
          joined_at: room.created_at,
          is_owner: true,
        }
      : null;

  const shouldAddOwnerFallback =
    ownerFallback !== null &&
    !approvedMembersFromApi.some(
      (member) => member.user_id === ownerFallback.user_id,
    );

  const approvedMembers = shouldAddOwnerFallback
    ? [ownerFallback, ...approvedMembersFromApi]
    : approvedMembersFromApi;

  const displayOwner = owner || ownerFallback;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-full border border-zinc-200 bg-white/85 px-5 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          ← 返回
        </button>

        {room.is_owner && (
          <div className="flex flex-wrap justify-end gap-2">
            {room.room_status === "open" && (
              <button
                type="button"
                onClick={handleCloseRecruiting}
                disabled={isActionLoading}
                className="rounded-full border border-zinc-200 bg-white/85 px-5 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {isActionLoading ? "處理中..." : "停止招募"}
              </button>
            )}

            {room.room_status === "recruiting_closed" && (
              <button
                type="button"
                onClick={handleOpenRecruiting}
                disabled={isActionLoading}
                className="rounded-full border border-zinc-200 bg-white/85 px-5 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {isActionLoading ? "處理中..." : "恢復招募"}
              </button>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              disabled={isActionLoading}
              className="rounded-full border border-red-200 bg-white/85 px-5 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/60 dark:bg-zinc-900/70 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              {isActionLoading ? "處理中..." : "解散房間"}
            </button>
          </div>
        )}
      </div>

      <section className="overflow-hidden rounded-3xl border border-zinc-200/70 bg-white/85 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
        <div className="grid gap-6 p-6 md:grid-cols-[auto_1fr] md:p-10">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-50 to-blue-50 shadow-sm dark:from-purple-500/10 dark:to-blue-500/10">
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 md:text-4xl">
                  {room.name}
                </h1>

                {room.description && (
                  <p className="mt-3 max-w-2xl leading-7 text-zinc-500 dark:text-zinc-400">
                    {room.description}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {room.is_owner && (
                  <span className="rounded-full bg-purple-100 px-4 py-1.5 text-sm font-semibold text-purple-600 dark:bg-purple-500/15 dark:text-purple-300">
                    擁有者
                  </span>
                )}

                {isPending && (
                  <span className="rounded-full bg-orange-100 px-4 py-1.5 text-sm font-semibold text-orange-600 dark:bg-orange-500/15 dark:text-orange-300">
                    待審核
                  </span>
                )}

                <span className="rounded-full bg-blue-100 px-4 py-1.5 text-sm font-semibold text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                  {getRoomStatusLabel(room.room_status)}
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  成員人數
                </p>
                <p className="mt-1 text-xl font-bold text-zinc-950 dark:text-zinc-50">
                  {room.member_count}/{room.max_capacity}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  房主
                </p>
                <p className="mt-1 truncate text-xl font-bold text-zinc-950 dark:text-zinc-50">
                  {displayOwner ? displayOwner.name : "尚未取得"}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  活動時間
                </p>
                <p className="mt-1 text-base font-semibold text-zinc-950 dark:text-zinc-50">
                  {formatDate(room.event_time)}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  活動地點
                </p>
                <p className="mt-1 truncate text-base font-semibold text-zinc-950 dark:text-zinc-50">
                  {room.location || "尚未設定"}
                </p>
              </div>
            </div>

            {room.join_approval_required && !room.is_owner && (
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                此房間需要房主審核後才能加入。
              </p>
            )}

            {room.room_status === "recruiting_closed" && !room.is_owner && (
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                此房間目前已停止招募新成員。
              </p>
            )}

            {error && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {!room.is_member && !isPending && (
                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={!canJoin || isActionLoading}
                  className="rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {getJoinButtonText(room, isFull, isActionLoading)}
                </button>
              )}

              {canViewMembers && (
                <button
                  type="button"
                  onClick={() => router.push(`/rooms/chat?room_id=${roomId}`)}
                  className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  群聊
                </button>
              )}

              {room.is_member && !room.is_owner && (
                <button
                  type="button"
                  onClick={handleLeave}
                  disabled={isActionLoading}
                  className="rounded-full border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  {isActionLoading ? "離開中..." : "離開房間"}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {canViewMembers && (
        <section className="rounded-3xl border border-zinc-200/70 bg-white/85 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-2 rounded-full bg-zinc-100 p-1 dark:bg-zinc-800">
              <button
                type="button"
                onClick={() => setActiveTab("members")}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  activeTab === "members"
                    ? "bg-white text-purple-600 shadow-sm dark:bg-zinc-900 dark:text-purple-300"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                成員 ({approvedMembers.length})
              </button>

              {room.is_owner && (
                <button
                  type="button"
                  onClick={() => setActiveTab("requests")}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                    activeTab === "requests"
                      ? "bg-white text-purple-600 shadow-sm dark:bg-zinc-900 dark:text-purple-300"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }`}
                >
                  申請 ({requests.length})
                </button>
              )}
            </div>

            {activeTab === "requests" && room.is_owner && requests.length > 0 && (
              <button
                type="button"
                onClick={handleApproveAll}
                disabled={isActionLoading}
                className="rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-purple-500/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isActionLoading ? "處理中..." : "全部批准"}
              </button>
            )}
          </div>

          {activeTab === "members" && (
            <div className="space-y-3">
              {approvedMembers.length === 0 && (
                <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/70 p-5 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                  目前沒有已批准的成員。
                </div>
              )}

              {approvedMembers.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-blue-100 font-bold text-purple-600 dark:from-purple-500/20 dark:to-blue-500/20 dark:text-purple-300">
                      {member.name[0]?.toUpperCase() || "U"}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-zinc-950 dark:text-zinc-50">
                        {member.name}
                      </p>
                      <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                        @{member.username}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {member.is_owner && (
                      <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-600 dark:bg-purple-500/15 dark:text-purple-300">
                        擁有者
                      </span>
                    )}

                    {room.is_owner && !member.is_owner && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.user_id)}
                        disabled={isActionLoading}
                        className="rounded-full px-3 py-1 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10"
                      >
                        移除
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "requests" && room.is_owner && (
            <div className="space-y-3">
              {requests.length === 0 && (
                <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/70 p-5 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                  目前沒有待審核申請。
                </div>
              )}

              {requests.map((request) => (
                <div
                  key={request.user_id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-600 dark:bg-orange-500/15 dark:text-orange-300">
                      {request.name[0]?.toUpperCase() || "U"}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-zinc-950 dark:text-zinc-50">
                        {request.name}
                      </p>
                      <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                        @{request.username}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApprove(request.user_id)}
                      disabled={isActionLoading}
                      className="rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-purple-500/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      批准
                    </button>

                    <button
                      type="button"
                      onClick={() => handleReject(request.user_id)}
                      disabled={isActionLoading}
                      className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      拒絕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default function RoomDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <div className="h-10 w-32 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-64 animate-pulse rounded-3xl bg-zinc-200 dark:bg-zinc-800" />
        </div>
      }
    >
      <RoomDetailContent />
    </Suspense>
  );
}