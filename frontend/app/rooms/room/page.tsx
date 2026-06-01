"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
  getMemberCreditScores,
  evaluateMembers,
  evaluateOwner,
  getEvaluationStatus,
  listWaitlist,
  promoteFromWaitlist,
} from "@/lib/api";
import type {
  RoomDetails,
  RoomMember,
  JoinRequest,
  CreditScoreMember,
  ViolationReason,
} from "@/types/rooms";

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
  // A full but still-open room can be joined as a waitlist entry.
  if (isFull && room.room_status === "open") return "加入候補";
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
  const [waitlist, setWaitlist] = useState<RoomMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"members" | "waiting" | "evaluate">("members");
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Credit score evaluation state (owner only)
  const [creditScoreMembers, setCreditScoreMembers] = useState<CreditScoreMember[]>([]);
  const [violations, setViolations] = useState<Record<string, Set<ViolationReason>>>({});
  const [evaluateLoading, setEvaluateLoading] = useState(false);
  const [evaluateError, setEvaluateError] = useState<string | null>(null);
  const [evaluateSuccess, setEvaluateSuccess] = useState(false);

  // Member evaluates owner state
  const [ownerViolations, setOwnerViolations] = useState<Set<ViolationReason>>(new Set());
  const [ownerEvalLoading, setOwnerEvalLoading] = useState(false);
  const [ownerEvalError, setOwnerEvalError] = useState<string | null>(null);
  const [ownerEvalSuccess, setOwnerEvalSuccess] = useState(false);
  const [alreadyEvaluated, setAlreadyEvaluated] = useState(false);

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

        try {
          const waitlistRes = await listWaitlist(roomId);
          setWaitlist(waitlistRes.data.waitlist);
        } catch (_e) {
          setWaitlist([]);
        }

        if (roomData.room_status === "ended") {
          try {
            const [creditRes, statusRes] = await Promise.all([
              getMemberCreditScores(roomId),
              getEvaluationStatus(roomId),
            ]);
            const scoreMembers = creditRes.data.members;
            setCreditScoreMembers(scoreMembers);
            const init: Record<string, Set<ViolationReason>> = {};
            for (const m of scoreMembers) init[m.user_id] = new Set();
            setViolations(init);
            setAlreadyEvaluated(statusRes.data.has_evaluated);
            if (statusRes.data.has_evaluated) {
              setEvaluateSuccess(true);
              setOwnerEvalSuccess(true);
            }
          } catch (_e) {
            // Not critical if this fails
          }
        }
      } else {
        setRequests([]);
        setWaitlist([]);
        if (roomData.room_status === "ended" && roomData.is_member) {
          try {
            const statusRes = await getEvaluationStatus(roomId);
            if (statusRes.data.has_evaluated) {
              setOwnerEvalSuccess(true);
            }
          } catch (_e) {
            // Not critical
          }
        }
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

  const toggleViolation = (memberId: string, reason: ViolationReason) => {
    setViolations((prev) => {
      const next = { ...prev };
      const set = new Set(next[memberId] ?? []);
      if (set.has(reason)) set.delete(reason);
      else set.add(reason);
      next[memberId] = set;
      return next;
    });
  };

  const handleEvaluate = async () => {
    if (!roomId) return;
    setEvaluateLoading(true);
    setEvaluateError(null);
    try {
      const evaluations = creditScoreMembers.map((m) => ({
        user_id: m.user_id,
        violations: Array.from(violations[m.user_id] ?? []),
      }));
      await evaluateMembers(roomId, evaluations);
      setEvaluateSuccess(true);
    } catch (e: unknown) {
      const msg =
        e &&
        typeof e === "object" &&
        "error" in e &&
        typeof (e as { error: { message?: string } }).error?.message === "string"
          ? (e as { error: { message: string } }).error.message
          : "評分提交失敗";
      setEvaluateError(msg);
    } finally {
      setEvaluateLoading(false);
    }
  };

  const toggleOwnerViolation = (reason: ViolationReason) => {
    setOwnerViolations((prev) => {
      const next = new Set(prev);
      if (next.has(reason)) next.delete(reason); else next.add(reason);
      return next;
    });
  };

  const handleEvaluateOwner = async () => {
    if (!roomId) return;
    setOwnerEvalLoading(true);
    setOwnerEvalError(null);
    try {
      await evaluateOwner(roomId, Array.from(ownerViolations));
      setOwnerEvalSuccess(true);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "error" in e &&
        typeof (e as { error: { message?: string } }).error?.message === "string"
          ? (e as { error: { message: string } }).error.message
          : "評分提交失敗";
      setOwnerEvalError(msg);
    } finally {
      setOwnerEvalLoading(false);
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

  const handlePromote = async (userId: string) => {
    if (!roomId) return;

    setIsActionLoading(true);
    try {
      await promoteFromWaitlist(roomId, userId);
      await fetchRoomData();
    } catch (e) {
      console.error("Failed to promote from waitlist:", e);
      setError(e instanceof Error ? e.message : "遞補失敗：房間可能已滿");
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
  const isWaitlisted = !room.is_owner && room.membership_status === "waitlisted";
  // Once the activity is underway (or finished) leaving no longer makes sense,
  // so the leave button is hidden for in_progress / ended rooms.
  const hasStarted =
    room.room_status === "in_progress" || room.room_status === "ended";
  // A full room is still joinable — the join lands on the waitlist — so being
  // full no longer blocks the button (only non-open / already-in states do).
  const canJoin =
    room.room_status === "open" &&
    !room.is_member &&
    !isPending &&
    !isWaitlisted;

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

  // Owners see a single "waiting to join" queue that merges two underlying
  // reasons: pending approval requests and waitlist entries (room was full).
  // The reason is shown as a badge; the admit action routes to the right
  // backend call. Both require a free slot, so the admit button is disabled
  // when the room is full.
  const waitingEntries: {
    user_id: string;
    name: string;
    username: string;
    kind: "pending" | "waitlisted";
  }[] = [
    ...requests.map((r) => ({
      user_id: r.user_id,
      name: r.name,
      username: r.username,
      kind: "pending" as const,
    })),
    ...waitlist.map((w) => ({
      user_id: w.user_id,
      name: w.name,
      username: w.username,
      kind: "waitlisted" as const,
    })),
  ];

  const handleAdmit = (entry: { user_id: string; kind: "pending" | "waitlisted" }) =>
    entry.kind === "pending"
      ? handleApprove(entry.user_id)
      : handlePromote(entry.user_id);

  const handleDecline = (entry: { user_id: string; kind: "pending" | "waitlisted" }) =>
    entry.kind === "pending"
      ? handleReject(entry.user_id)
      : handleRemoveMember(entry.user_id);

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

              {!room.is_owner && (
                <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-500/10">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    房主信用分數
                  </p>
                  <p className={`mt-1 text-xl font-bold ${room.owner_credit_score < 8 ? "text-red-600 dark:text-red-400" : "text-amber-700 dark:text-amber-300"}`}>
                    {room.owner_credit_score} 分
                  </p>
                </div>
              )}

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

            {isWaitlisted && (
              <p className="mt-4 text-sm text-amber-600 dark:text-amber-400">
                房間目前已滿，你已加入候補名單。有名額時房主會手動遞補。
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {!room.is_member && !isPending && !isWaitlisted && (
                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={!canJoin || isActionLoading}
                  className="rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {getJoinButtonText(room, isFull, isActionLoading)}
                </button>
              )}

              {isWaitlisted && (
                <button
                  type="button"
                  onClick={handleLeave}
                  disabled={isActionLoading}
                  className="rounded-full border border-amber-300 bg-amber-50 px-6 py-3 text-sm font-semibold text-amber-700 shadow-sm transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
                >
                  {isActionLoading ? "處理中..." : "取消候補"}
                </button>
              )}

              {room.is_member && !room.is_owner && !hasStarted && (
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
            <div className="flex items-center gap-3">
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
                  onClick={() => setActiveTab("waiting")}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                    activeTab === "waiting"
                      ? "bg-white text-purple-600 shadow-sm dark:bg-zinc-900 dark:text-purple-300"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }`}
                >
                  等待加入 ({waitingEntries.length})
                </button>
              )}

              {room.room_status === "ended" && (room.is_owner || room.is_member) && (
                <button
                  type="button"
                  onClick={() => setActiveTab("evaluate")}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                    activeTab === "evaluate"
                      ? "bg-white text-amber-600 shadow-sm dark:bg-zinc-900 dark:text-amber-300"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }`}
                >
                  活動評分
                </button>
              )}
            </div>

            <Link
              href={`/rooms/chat?room_id=${roomId}`}
              className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              群聊
            </Link>
            </div>

            {activeTab === "waiting" && room.is_owner && requests.length > 0 && (
              <button
                type="button"
                onClick={handleApproveAll}
                disabled={isActionLoading || isFull}
                title={isFull ? "房間已滿，需先有名額" : undefined}
                className="rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-purple-500/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isActionLoading ? "處理中..." : "批准所有申請"}
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

                    {room.is_owner && typeof member.credit_score === "number" && (
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        member.credit_score >= 8
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                          : member.credit_score >= 5
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                            : "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300"
                      }`}>
                        ★ {member.credit_score} 分
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

          {activeTab === "waiting" && room.is_owner && (
            <div className="space-y-3">
              {waitingEntries.length === 0 && (
                <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/70 p-5 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                  目前沒有等待加入的人。需審核的申請與滿房後的候補都會出現在這裡。
                </div>
              )}

              {isFull && waitingEntries.length > 0 && (
                <p className="px-1 text-sm text-amber-600 dark:text-amber-400">
                  房間目前已滿，需先有名額（移除成員或有人離開）才能讓人加入。
                </p>
              )}

              {waitingEntries.map((entry) => {
                const isWaitlistKind = entry.kind === "waitlisted";
                return (
                  <div
                    key={`${entry.kind}-${entry.user_id}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-bold ${
                          isWaitlistKind
                            ? "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300"
                            : "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300"
                        }`}
                      >
                        {entry.name[0]?.toUpperCase() || "U"}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-semibold text-zinc-950 dark:text-zinc-50">
                          {entry.name}
                          <span
                            className={`ml-2 rounded-full px-2 py-0.5 align-middle text-xs font-semibold ${
                              isWaitlistKind
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                                : "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300"
                            }`}
                          >
                            {isWaitlistKind ? "候補" : "待審核"}
                          </span>
                        </p>
                        <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                          @{entry.username}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAdmit(entry)}
                        disabled={isActionLoading || isFull}
                        title={isFull ? "房間已滿，需先有名額" : undefined}
                        className="rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-purple-500/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        批准加入
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDecline(entry)}
                        disabled={isActionLoading}
                        className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        {isWaitlistKind ? "移除" : "拒絕"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}


          {activeTab === "evaluate" && room.is_owner && room.room_status === "ended" && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                請為每位成員評分。勾選不合格行為（可複選），未勾選者將獲得 +1 信用積分獎勵。
              </p>

              {evaluateSuccess ? (
                <div className="rounded-2xl border border-green-200/70 bg-green-50/70 p-5 text-green-700 dark:border-green-900/40 dark:bg-green-500/10 dark:text-green-400">
                  ✓ 已提交評分
                </div>
              ) : (
                <>
                  {evaluateError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-500/10 dark:text-red-400">
                      {evaluateError}
                    </div>
                  )}

                  {creditScoreMembers.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/70 p-5 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                      沒有可評分的成員。
                    </div>
                  ) : (
                    <>
                      {creditScoreMembers.map((member) => {
                        const memberViolations = violations[member.user_id] ?? new Set<ViolationReason>();
                        const hasViolations = memberViolations.size > 0;

                        return (
                          <div
                            key={member.user_id}
                            className={`rounded-2xl border p-4 shadow-sm transition ${
                              hasViolations
                                ? "border-red-200/70 bg-red-50/40 dark:border-red-900/40 dark:bg-red-500/5"
                                : "border-green-200/70 bg-green-50/40 dark:border-green-900/40 dark:bg-green-500/5"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-bold ${
                                  hasViolations
                                    ? "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300"
                                    : "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-300"
                                }`}>
                                  {member.name[0]?.toUpperCase() || "U"}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-zinc-950 dark:text-zinc-50">
                                    {member.name}
                                  </p>
                                  <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                                    @{member.username} · 目前信用：{member.credit_score} 分
                                  </p>
                                </div>
                              </div>

                              <div className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                                hasViolations
                                  ? "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300"
                                  : "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                              }`}>
                                {hasViolations ? `−${memberViolations.size} 分` : "+1 分"}
                              </div>
                            </div>

                            <div className="mt-3 space-y-2">
                              {(
                                [
                                  {
                                    group: "出席問題",
                                    items: [
                                      { reason: "late" as ViolationReason, label: "遲到" },
                                      { reason: "last_minute_cancel" as ViolationReason, label: "臨時取消" },
                                      { reason: "ghost" as ViolationReason, label: "爽約無通知" },
                                      { reason: "no_show" as ViolationReason, label: "無故缺席" },
                                      { reason: "early_leave" as ViolationReason, label: "提早離場" },
                                      { reason: "midway_leave" as ViolationReason, label: "中途落跑" },
                                    ],
                                  },
                                  {
                                    group: "人員問題",
                                    items: [
                                      { reason: "proxy_register" as ViolationReason, label: "替人報名但本人沒來" },
                                      { reason: "bring_extra" as ViolationReason, label: "臨時帶人來" },
                                    ],
                                  },
                                  {
                                    group: "行為問題",
                                    items: [
                                      { reason: "attack" as ViolationReason, label: "攻擊行為" },
                                      { reason: "harassment" as ViolationReason, label: "騷擾" },
                                      { reason: "verbal_abuse" as ViolationReason, label: "言語不當" },
                                      { reason: "property_damage" as ViolationReason, label: "損壞財物" },
                                      { reason: "discrimination" as ViolationReason, label: "歧視行為" },
                                      { reason: "rule_violation" as ViolationReason, label: "違反規定" },
                                    ],
                                  },
                                  {
                                    group: "費用問題",
                                    items: [
                                      { reason: "payment_default" as ViolationReason, label: "不付費／拖欠費用" },
                                      { reason: "payment_dispute" as ViolationReason, label: "AA制臨時反悔" },
                                    ],
                                  },
                                ] as const
                              ).map(({ group, items }) => (
                                <div key={group}>
                                  <p className="mb-1.5 text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                                    {group}
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {items.map(({ reason, label }) => {
                                      const checked = memberViolations.has(reason);
                                      return (
                                        <button
                                          key={reason}
                                          type="button"
                                          onClick={() => toggleViolation(member.user_id, reason)}
                                          disabled={evaluateLoading}
                                          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed ${
                                            checked
                                              ? "border-red-400 bg-red-100 text-red-700 dark:border-red-500/60 dark:bg-red-500/20 dark:text-red-300"
                                              : "border-zinc-200 bg-white text-zinc-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-red-700 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                                          }`}
                                        >
                                          <span className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center text-xs ${
                                            checked
                                              ? "border-red-500 bg-red-500 text-white"
                                              : "border-zinc-300 dark:border-zinc-600"
                                          }`}>
                                            {checked ? "✓" : ""}
                                          </span>
                                          {label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={handleEvaluate}
                          disabled={evaluateLoading}
                          className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {evaluateLoading ? "提交中..." : "提交評分"}
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === "evaluate" && !room.is_owner && room.is_member && room.room_status === "ended" && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                請為房主評分。勾選不合格行為（可複選），未勾選將給予 +1 信用積分獎勵。
              </p>

              {ownerEvalSuccess ? (
                <div className="rounded-2xl border border-green-200/70 bg-green-50/70 p-5 text-green-700 dark:border-green-900/40 dark:bg-green-500/10 dark:text-green-400">
                  ✓ 已提交評分
                </div>
              ) : (
                <>
                  {ownerEvalError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-500/10 dark:text-red-400">
                      {ownerEvalError}
                    </div>
                  )}

                  {displayOwner && (
                    <>
                      <div className={`rounded-2xl border p-4 shadow-sm transition ${
                        ownerViolations.size > 0
                          ? "border-red-200/70 bg-red-50/40 dark:border-red-900/40 dark:bg-red-500/5"
                          : "border-green-200/70 bg-green-50/40 dark:border-green-900/40 dark:bg-green-500/5"
                      }`}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-bold ${
                              ownerViolations.size > 0
                                ? "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300"
                                : "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-300"
                            }`}>
                              {displayOwner.name[0]?.toUpperCase() || "U"}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-zinc-950 dark:text-zinc-50">
                                {displayOwner.name}
                              </p>
                              <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                                @{displayOwner.username} · 目前信用：{room.owner_credit_score} 分
                              </p>
                            </div>
                          </div>
                          <div className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                            ownerViolations.size > 0
                              ? "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300"
                              : "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                          }`}>
                            {ownerViolations.size > 0 ? `−${ownerViolations.size} 分` : "+1 分"}
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          {(
                            [
                              { group: "出席問題", items: [
                                { reason: "late" as ViolationReason, label: "遲到" },
                                { reason: "last_minute_cancel" as ViolationReason, label: "臨時取消" },
                                { reason: "ghost" as ViolationReason, label: "爽約無通知" },
                                { reason: "no_show" as ViolationReason, label: "無故缺席" },
                                { reason: "early_leave" as ViolationReason, label: "提早離場" },
                                { reason: "midway_leave" as ViolationReason, label: "中途落跑" },
                              ]},
                              { group: "行為問題", items: [
                                { reason: "attack" as ViolationReason, label: "攻擊行為" },
                                { reason: "harassment" as ViolationReason, label: "騷擾" },
                                { reason: "verbal_abuse" as ViolationReason, label: "言語不當" },
                                { reason: "property_damage" as ViolationReason, label: "損壞財物" },
                                { reason: "discrimination" as ViolationReason, label: "歧視行為" },
                                { reason: "rule_violation" as ViolationReason, label: "違反規定" },
                              ]},
                              { group: "費用問題", items: [
                                { reason: "payment_default" as ViolationReason, label: "不付費／拖欠費用" },
                                { reason: "payment_dispute" as ViolationReason, label: "AA制臨時反悔" },
                              ]},
                            ] as const
                          ).map(({ group, items }) => (
                            <div key={group}>
                              <p className="mb-1.5 text-xs font-semibold text-zinc-400 dark:text-zinc-500">{group}</p>
                              <div className="flex flex-wrap gap-2">
                                {items.map(({ reason, label }) => {
                                  const checked = ownerViolations.has(reason);
                                  return (
                                    <button key={reason} type="button"
                                      onClick={() => toggleOwnerViolation(reason)}
                                      disabled={ownerEvalLoading}
                                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed ${
                                        checked
                                          ? "border-red-400 bg-red-100 text-red-700 dark:border-red-500/60 dark:bg-red-500/20 dark:text-red-300"
                                          : "border-zinc-200 bg-white text-zinc-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-red-700 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                                      }`}>
                                      <span className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center text-xs ${
                                        checked ? "border-red-500 bg-red-500 text-white" : "border-zinc-300 dark:border-zinc-600"
                                      }`}>{checked ? "✓" : ""}</span>
                                      {label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button type="button" onClick={handleEvaluateOwner} disabled={ownerEvalLoading}
                          className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                          {ownerEvalLoading ? "提交中..." : "提交評分"}
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
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