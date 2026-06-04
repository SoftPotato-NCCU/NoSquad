"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useDictionary, t, tpl } from "@/lib/i18n/useDictionary";
import type { Dictionary } from "@/lib/i18n/getDictionary";
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

function formatDate(value: string | null, fallback: string) {
  if (!value) return fallback;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRoomStatusLabel(dict: Dictionary, status: RoomDetails["room_status"]) {
  switch (status) {
    case "open":
      return t(dict, "rooms.status.open", "Recruiting");
    case "recruiting_closed":
      return t(dict, "rooms.status.recruitingClosed", "Recruiting Closed");
    case "in_progress":
      return t(dict, "rooms.status.inProgress", "In Progress");
    case "ended":
      return t(dict, "rooms.status.ended", "Ended");
    case "cancelled":
      return t(dict, "rooms.status.cancelled", "Cancelled");
    default:
      return t(dict, "rooms.status.unknown", "Unknown Status");
  }
}

function getJoinButtonText(
  dict: Dictionary,
  room: RoomDetails,
  isFull: boolean,
  isActionLoading: boolean,
) {
  if (isActionLoading) return t(dict, "rooms.join.joining", "Joining...");
  // A full but still-open room can be joined as a waitlist entry.
  if (isFull && room.room_status === "open") return t(dict, "rooms.join.joinWaitlist", "Join Waitlist");
  if (isFull) return t(dict, "rooms.join.full", "Room Full");

  switch (room.room_status) {
    case "open":
      return room.join_approval_required
        ? t(dict, "rooms.join.request", "Request to Join")
        : t(dict, "rooms.join.joinRoom", "Join Room");
    case "recruiting_closed":
      return t(dict, "rooms.status.recruitingClosed", "Recruiting Closed");
    case "in_progress":
      return t(dict, "rooms.join.activityInProgress", "Activity in Progress");
    case "ended":
      return t(dict, "rooms.join.activityEnded", "Activity Ended");
    case "cancelled":
      return t(dict, "rooms.join.roomCancelled", "Room Cancelled");
    default:
      return t(dict, "rooms.join.unavailable", "Unavailable");
  }
}

function RoomDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const { dict } = useDictionary("rooms");
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
      setError(t(dict, "rooms.detail.missingRoomId", "Room ID not found"));
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
    if (!confirm(t(dict, "rooms.detail.confirmDismiss", "Are you sure you want to dismiss this room?"))) return;

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
      setError(e instanceof Error ? e.message : t(dict, "rooms.detail.closeRecruitingFailed", "Failed to close recruiting"));
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
      setError(e instanceof Error ? e.message : t(dict, "rooms.detail.openRecruitingFailed", "Failed to resume recruiting"));
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
          : t(dict, "rooms.detail.evaluateFailed", "Failed to submit review");
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
          : t(dict, "rooms.detail.evaluateFailed", "Failed to submit review");
      setOwnerEvalError(msg);
    } finally {
      setOwnerEvalLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!roomId) return;
    if (!confirm(t(dict, "rooms.detail.confirmRemove", "Are you sure you want to remove this member?"))) return;

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
      setError(e instanceof Error ? e.message : t(dict, "rooms.detail.promoteFailed", "Failed to promote: the room may be full"));
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
          ← {t(dict, "rooms.common.back", "Back")}
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
          ← {t(dict, "rooms.common.back", "Back")}
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
                {isActionLoading
                  ? t(dict, "rooms.common.processing", "Processing...")
                  : t(dict, "rooms.detail.closeRecruiting", "Close Recruiting")}
              </button>
            )}

            {room.room_status === "recruiting_closed" && (
              <button
                type="button"
                onClick={handleOpenRecruiting}
                disabled={isActionLoading}
                className="rounded-full border border-zinc-200 bg-white/85 px-5 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {isActionLoading
                  ? t(dict, "rooms.common.processing", "Processing...")
                  : t(dict, "rooms.detail.openRecruiting", "Resume Recruiting")}
              </button>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              disabled={isActionLoading}
              className="rounded-full border border-red-200 bg-white/85 px-5 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/60 dark:bg-zinc-900/70 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              {isActionLoading
                ? t(dict, "rooms.common.processing", "Processing...")
                : t(dict, "rooms.detail.dismissRoom", "Dismiss Room")}
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
                    {t(dict, "rooms.join.owner", "Owner")}
                  </span>
                )}

                {isPending && (
                  <span className="rounded-full bg-orange-100 px-4 py-1.5 text-sm font-semibold text-orange-600 dark:bg-orange-500/15 dark:text-orange-300">
                    {t(dict, "rooms.join.pending", "Pending")}
                  </span>
                )}

                <span className="rounded-full bg-blue-100 px-4 py-1.5 text-sm font-semibold text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                  {getRoomStatusLabel(dict, room.room_status)}
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {t(dict, "rooms.detail.labels.memberCount", "Members")}
                </p>
                <p className="mt-1 text-xl font-bold text-zinc-950 dark:text-zinc-50">
                  {room.member_count}/{room.max_capacity}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {t(dict, "rooms.detail.labels.host", "Host")}
                </p>
                <p className="mt-1 truncate text-xl font-bold text-zinc-950 dark:text-zinc-50">
                  {displayOwner?.name ?? room.owner_name ?? t(dict, "rooms.detail.messages.hostUnknown", "Unavailable")}
                </p>
              </div>

              {!room.is_owner && (
                <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-500/10">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    {t(dict, "rooms.detail.labels.hostCredit", "Host Credit Score")}
                  </p>
                  <p className={`mt-1 text-xl font-bold ${room.owner_credit_score < 8 ? "text-red-600 dark:text-red-400" : "text-amber-700 dark:text-amber-300"}`}>
                    {room.owner_credit_score} {t(dict, "rooms.common.points", "pts")}
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {t(dict, "rooms.detail.labels.eventTime", "Activity Time")}
                </p>
                <p className="mt-1 text-base font-semibold text-zinc-950 dark:text-zinc-50">
                  {formatDate(room.event_time, t(dict, "rooms.common.timeNotSet", "Time not set"))}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {t(dict, "rooms.detail.labels.location", "Activity Location")}
                </p>
                <p className="mt-1 truncate text-base font-semibold text-zinc-950 dark:text-zinc-50">
                  {room.location || t(dict, "rooms.common.notSet", "Not set")}
                </p>
              </div>
            </div>

            {room.join_approval_required && !room.is_owner && (
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                {t(dict, "rooms.detail.messages.approvalRequired", "This room requires host approval before you can join.")}
              </p>
            )}

            {room.room_status === "recruiting_closed" && !room.is_owner && (
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                {t(dict, "rooms.detail.messages.recruitingClosed", "This room is no longer recruiting new members.")}
              </p>
            )}

            {error && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </div>
            )}

            {isWaitlisted && (
              <p className="mt-4 text-sm text-amber-600 dark:text-amber-400">
                {t(dict, "rooms.detail.messages.waitlisted", "The room is full. You are on the waitlist and the host can promote you when a spot opens.")}
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
                  {getJoinButtonText(dict, room, isFull, isActionLoading)}
                </button>
              )}

              {isWaitlisted && (
                <button
                  type="button"
                  onClick={handleLeave}
                  disabled={isActionLoading}
                  className="rounded-full border border-amber-300 bg-amber-50 px-6 py-3 text-sm font-semibold text-amber-700 shadow-sm transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
                >
                  {isActionLoading
                    ? t(dict, "rooms.common.processing", "Processing...")
                    : t(dict, "rooms.detail.cancelWaitlist", "Cancel Waitlist")}
                </button>
              )}

              {room.is_member && !room.is_owner && !hasStarted && (
                <button
                  type="button"
                  onClick={handleLeave}
                  disabled={isActionLoading}
                  className="rounded-full border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  {isActionLoading
                    ? t(dict, "rooms.detail.leaving", "Leaving...")
                    : t(dict, "rooms.detail.leaveRoom", "Leave Room")}
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
                {tpl(dict, "rooms.detail.tabs.members", { count: String(approvedMembers.length) }, `Members (${approvedMembers.length})`)}
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
                  {tpl(dict, "rooms.detail.tabs.waiting", { count: String(waitingEntries.length) }, `Waiting (${waitingEntries.length})`)}
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
                  {t(dict, "rooms.detail.tabs.evaluate", "Activity Review")}
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
              {t(dict, "rooms.detail.chat", "Group Chat")}
            </Link>
            </div>

            {activeTab === "waiting" && room.is_owner && requests.length > 0 && (
              <button
                type="button"
                onClick={handleApproveAll}
                disabled={isActionLoading || isFull}
                title={isFull ? t(dict, "rooms.detail.messages.fullNeedsSpace", "The room is full. A spot must open before another person can join.") : undefined}
                className="rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-purple-500/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isActionLoading
                  ? t(dict, "rooms.common.processing", "Processing...")
                  : t(dict, "rooms.detail.approveAll", "Approve All Requests")}
              </button>
            )}
          </div>

          {activeTab === "members" && (
            <div className="space-y-3">
              {approvedMembers.length === 0 && (
                <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/70 p-5 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                  {t(dict, "rooms.detail.messages.noApprovedMembers", "There are no approved members yet.")}
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
                        {t(dict, "rooms.join.owner", "Owner")}
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
                        ★ {member.credit_score} {t(dict, "rooms.common.points", "pts")}
                      </span>
                    )}

                    {room.is_owner && !member.is_owner && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.user_id)}
                        disabled={isActionLoading}
                        className="rounded-full px-3 py-1 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10"
                      >
                        {t(dict, "rooms.detail.remove", "Remove")}
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
                  {t(dict, "rooms.detail.messages.noWaiting", "No one is waiting to join. Pending requests and waitlist entries will appear here.")}
                </div>
              )}

              {isFull && waitingEntries.length > 0 && (
                <p className="px-1 text-sm text-amber-600 dark:text-amber-400">
                  {t(dict, "rooms.detail.messages.fullNeedsSpace", "The room is full. A spot must open before another person can join.")}
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
                            {isWaitlistKind
                              ? t(dict, "rooms.detail.waitlisted", "Waitlisted")
                              : t(dict, "rooms.join.pending", "Pending")}
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
                        title={isFull ? t(dict, "rooms.detail.messages.fullNeedsSpace", "The room is full. A spot must open before another person can join.") : undefined}
                        className="rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-purple-500/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {t(dict, "rooms.detail.admit", "Approve")}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDecline(entry)}
                        disabled={isActionLoading}
                        className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        {isWaitlistKind
                          ? t(dict, "rooms.detail.remove", "Remove")
                          : t(dict, "rooms.detail.reject", "Reject")}
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
                {t(dict, "rooms.evaluation.ownerInstructions", "Review each member. Select any rule violations (multiple allowed). Members with no violations receive a +1 credit bonus.")}
              </p>

              {evaluateSuccess ? (
                <div className="rounded-2xl border border-green-200/70 bg-green-50/70 p-5 text-green-700 dark:border-green-900/40 dark:bg-green-500/10 dark:text-green-400">
                  ✓ {t(dict, "rooms.evaluation.submitted", "Submitted")}
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
                      {t(dict, "rooms.evaluation.noMembers", "No members to review.")}
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
                                    @{member.username} · {tpl(dict, "rooms.common.currentCredit", { score: String(member.credit_score) }, `Current credit: ${member.credit_score} pts`)}
                                  </p>
                                </div>
                              </div>

                              <div className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                                hasViolations
                                  ? "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300"
                                  : "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                              }`}>
                                {hasViolations
                                  ? tpl(dict, "rooms.common.scoreChangeNegative", { count: String(memberViolations.size) }, `-${memberViolations.size} pts`)
                                  : t(dict, "rooms.common.scoreChangePositive", "+1 pt")}
                              </div>
                            </div>

                            <div className="mt-3 space-y-2">
                              {(
                                [
                                  {
                                    group: t(dict, "rooms.evaluation.groups.attendance", "Attendance Issues"),
                                    items: [
                                      { reason: "late" as ViolationReason, label: t(dict, "rooms.evaluation.reasons.late", "Late") },
                                      { reason: "last_minute_cancel" as ViolationReason, label: t(dict, "rooms.evaluation.reasons.last_minute_cancel", "Last-minute cancellation") },
                                      { reason: "ghost" as ViolationReason, label: t(dict, "rooms.evaluation.reasons.ghost", "No notice") },
                                      { reason: "no_show" as ViolationReason, label: t(dict, "rooms.evaluation.reasons.no_show", "No-show") },
                                      { reason: "early_leave" as ViolationReason, label: t(dict, "rooms.evaluation.reasons.early_leave", "Left early") },
                                      { reason: "midway_leave" as ViolationReason, label: t(dict, "rooms.evaluation.reasons.midway_leave", "Left midway") },
                                    ],
                                  },
                                  {
                                    group: t(dict, "rooms.evaluation.groups.personnel", "Personnel Issues"),
                                    items: [
                                      { reason: "proxy_register" as ViolationReason, label: t(dict, "rooms.evaluation.reasons.proxy_register", "Registered for someone else") },
                                      { reason: "bring_extra" as ViolationReason, label: t(dict, "rooms.evaluation.reasons.bring_extra", "Brought extra guests") },
                                    ],
                                  },
                                  {
                                    group: t(dict, "rooms.evaluation.groups.behavior", "Behavior Issues"),
                                    items: [
                                      { reason: "attack" as ViolationReason, label: t(dict, "rooms.evaluation.reasons.attack", "Attack") },
                                      { reason: "harassment" as ViolationReason, label: t(dict, "rooms.evaluation.reasons.harassment", "Harassment") },
                                      { reason: "verbal_abuse" as ViolationReason, label: t(dict, "rooms.evaluation.reasons.verbal_abuse", "Verbal abuse") },
                                      { reason: "property_damage" as ViolationReason, label: t(dict, "rooms.evaluation.reasons.property_damage", "Property damage") },
                                      { reason: "discrimination" as ViolationReason, label: t(dict, "rooms.evaluation.reasons.discrimination", "Discrimination") },
                                      { reason: "rule_violation" as ViolationReason, label: t(dict, "rooms.evaluation.reasons.rule_violation", "Rule violation") },
                                    ],
                                  },
                                  {
                                    group: t(dict, "rooms.evaluation.groups.payment", "Payment Issues"),
                                    items: [
                                      { reason: "payment_default" as ViolationReason, label: t(dict, "rooms.evaluation.reasons.payment_default", "Payment default") },
                                      { reason: "payment_dispute" as ViolationReason, label: t(dict, "rooms.evaluation.reasons.payment_dispute", "Payment dispute") },
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
                          {evaluateLoading
                            ? t(dict, "rooms.evaluation.submitting", "Submitting...")
                            : t(dict, "rooms.evaluation.submit", "Submit Review")}
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
                {t(dict, "rooms.evaluation.memberInstructions", "Review the host. Select any rule violations (multiple allowed). No selected violations gives a +1 credit bonus.")}
              </p>

              {ownerEvalSuccess ? (
                <div className="rounded-2xl border border-green-200/70 bg-green-50/70 p-5 text-green-700 dark:border-green-900/40 dark:bg-green-500/10 dark:text-green-400">
                  ✓ {t(dict, "rooms.evaluation.submitted", "Submitted")}
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
                                @{displayOwner.username} · {tpl(dict, "rooms.common.currentCredit", { score: String(room.owner_credit_score) }, `Current credit: ${room.owner_credit_score} pts`)}
                              </p>
                            </div>
                          </div>
                          <div className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                            ownerViolations.size > 0
                              ? "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300"
                              : "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                          }`}>
                            {ownerViolations.size > 0
                              ? tpl(dict, "rooms.common.scoreChangeNegative", { count: String(ownerViolations.size) }, `-${ownerViolations.size} pts`)
                              : t(dict, "rooms.common.scoreChangePositive", "+1 pt")}
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          {(
                            [
                              { group: t(dict, "rooms.evaluation.groups.attendance", "Attendance Issues"), items: [
                                { reason: "late" as ViolationReason, label: t(dict, "rooms.evaluation.reasons.late", "Late") },
                                { reason: "last_minute_cancel" as ViolationReason, label: t(dict, "rooms.evaluation.reasons.last_minute_cancel", "Last-minute cancellation") },
                                { reason: "ghost" as ViolationReason, label: t(dict, "rooms.evaluation.reasons.ghost", "No notice") },
                                { reason: "no_show" as ViolationReason, label: t(dict, "rooms.evaluation.reasons.no_show", "No-show") },
                                { reason: "early_leave" as ViolationReason, label: t(dict, "rooms.evaluation.reasons.early_leave", "Left early") },
                                { reason: "midway_leave" as ViolationReason, label: t(dict, "rooms.evaluation.reasons.midway_leave", "Left midway") },
                              ]},
                              { group: t(dict, "rooms.evaluation.groups.behavior", "Behavior Issues"), items: [
                                { reason: "attack" as ViolationReason, label: t(dict, "rooms.evaluation.reasons.attack", "Attack") },
                                { reason: "harassment" as ViolationReason, label: t(dict, "rooms.evaluation.reasons.harassment", "Harassment") },
                                { reason: "verbal_abuse" as ViolationReason, label: t(dict, "rooms.evaluation.reasons.verbal_abuse", "Verbal abuse") },
                                { reason: "property_damage" as ViolationReason, label: t(dict, "rooms.evaluation.reasons.property_damage", "Property damage") },
                                { reason: "discrimination" as ViolationReason, label: t(dict, "rooms.evaluation.reasons.discrimination", "Discrimination") },
                                { reason: "rule_violation" as ViolationReason, label: t(dict, "rooms.evaluation.reasons.rule_violation", "Rule violation") },
                              ]},
                              { group: t(dict, "rooms.evaluation.groups.payment", "Payment Issues"), items: [
                                { reason: "payment_default" as ViolationReason, label: t(dict, "rooms.evaluation.reasons.payment_default", "Payment default") },
                                { reason: "payment_dispute" as ViolationReason, label: t(dict, "rooms.evaluation.reasons.payment_dispute", "Payment dispute") },
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
                          {ownerEvalLoading
                            ? t(dict, "rooms.evaluation.submitting", "Submitting...")
                            : t(dict, "rooms.evaluation.submit", "Submit Review")}
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
