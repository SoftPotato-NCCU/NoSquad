"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useDictionary, t } from "@/lib/i18n/useDictionary";
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
} from "@/lib/api";
import type { RoomDetails, RoomMember, JoinRequest } from "@/types/rooms";

function RoomDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const { dict } = useDictionary("common");
  const roomId = searchParams.get("room_id");

  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"members" | "requests">("members");
  const [is_actionLoading, setIsActionLoading] = useState(false);

  const fetchRoomData = async () => {
    try {
      const [roomRes, membersRes] = await Promise.all([
        getRoomDetails(roomId!),
        listRoomMembers(roomId!),
      ]);
      setRoom(roomRes.data.room);
      setMembers(membersRes.data.members);

      if (roomRes.data.room.is_owner) {
        const requestsRes = await listJoinRequests(roomId!);
        setRequests(requestsRes.data.requests);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load room");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && roomId) {
      fetchRoomData();
    }
  }, [user, roomId]);

  const handleJoin = async () => {
    setIsActionLoading(true);
    try {
      await joinRoom(roomId!);
      await fetchRoomData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join room");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLeave = async () => {
    setIsActionLoading(true);
    try {
      await leaveRoom(roomId!);
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to leave room");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDismiss = async () => {
    if (!confirm("Are you sure you want to dismiss this room?")) return;
    setIsActionLoading(true);
    try {
      await dismissRoom(roomId!);
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to dismiss room");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    setIsActionLoading(true);
    try {
      await approveRequest(roomId!, userId);
      await fetchRoomData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to approve request");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async (userId: string) => {
    setIsActionLoading(true);
    try {
      await rejectRequest(roomId!, userId);
      await fetchRoomData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reject request");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleApproveAll = async () => {
    setIsActionLoading(true);
    try {
      await approveAllRequests(roomId!);
      await fetchRoomData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to approve requests");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    setIsActionLoading(true);
    try {
      await removeMember(roomId!, userId);
      await fetchRoomData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove member");
    } finally {
      setIsActionLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col flex-1 p-4">
        <div className="animate-pulse h-8 w-24 bg-zinc-200 rounded mb-4" />
        <div className="animate-pulse h-32 bg-zinc-200 rounded" />
      </div>
    );
  }

  if (!user) {
    router.push("/");
    return null;
  }

  if (error && !room) {
    return (
      <div className="flex flex-col flex-1 p-4">
        <p className="text-destructive mb-4">{error}</p>
        <button onClick={() => router.back()} className="text-primary hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  if (!room) return null;

  const isFull = room.member_count >= room.max_capacity;
  const isPending = room.membership_status === "pending";

  return (
    <div className="flex flex-col flex-1 p-4">
      <button
        onClick={() => router.back()}
        className="text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        &larr; Back
      </button>

      <div className="bg-card border border-border rounded-lg p-4 mb-4">
        <div className="flex justify-between items-start gap-2">
          <div>
            <h1 className="text-xl font-semibold">{room.name}</h1>
            {room.description && (
              <p className="text-muted-foreground mt-1">{room.description}</p>
            )}
          </div>
          {room.is_owner && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
              {t(dict, "owner", "Owner")}
            </span>
          )}
          {isPending && (
            <span className="text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded">
              {t(dict, "pending", "Pending")}
            </span>
          )}
        </div>

        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <p>{room.member_count}/{room.max_capacity} {t(dict, "members", "members")}</p>
          {room.join_approval_required && !room.is_owner && (
            <p>{t(dict, "approvalRequired", "Approval required to join")}</p>
          )}
          {room.event_time && (
            <p>{t(dict, "event", "Event")}: {new Date(room.event_time).toLocaleString()}</p>
          )}
          {room.location && <p>{t(dict, "location", "Location")}: {room.location}</p>}
          <p>{t(dict, "status", "Status")}: {room.status}</p>
        </div>

        <div className="mt-4 flex gap-2">
          {!room.is_member && !isPending && (
            <button
              onClick={handleJoin}
              disabled={isFull || is_actionLoading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {isFull ? t(dict, "full", "Full") : is_actionLoading ? t(dict, "joining", "Joining...") : t(dict, "join", "Join")}
            </button>
          )}
          {room.is_member && !room.is_owner && (
            <button
              onClick={handleLeave}
              disabled={is_actionLoading}
              className="px-4 py-2 border border-border text-foreground rounded-md hover:bg-card"
            >
              {is_actionLoading ? t(dict, "leaving", "Leaving...") : t(dict, "leave", "Leave")}
            </button>
          )}
          {room.is_owner && (
            <button
              onClick={handleDismiss}
              disabled={is_actionLoading}
              className="px-4 py-2 text-destructive hover:bg-destructive/10 rounded-md"
            >
              {is_actionLoading ? t(dict, "dismissing", "Dismissing...") : t(dict, "dismissRoom", "Dismiss Room")}
            </button>
          )}
        </div>

        {error && (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        )}
      </div>

      {room.is_member && (
        <div className="border-b border-border mb-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("members")}
              className={`pb-2 text-sm ${
                activeTab === "members"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground"
              }`}
            >
              {t(dict, "members", "Members")} ({members.length})
            </button>
            {room.is_owner && requests.length > 0 && (
              <button
                onClick={() => setActiveTab("requests")}
                className={`pb-2 text-sm ${
                  activeTab === "requests"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground"
                }`}
              >
                {t(dict, "requests", "Requests")} ({requests.length})
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === "members" && (
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.user_id}
              className="flex items-center justify-between p-3 bg-card border border-border rounded-lg"
            >
              <div>
                <p className="font-medium">{member.name}</p>
                <p className="text-sm text-muted-foreground">@{member.username}</p>
              </div>
              <div className="flex items-center gap-2">
                {member.is_owner && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {t(dict, "owner", "Owner")}
                  </span>
                )}
                {room.is_owner && !member.is_owner && (
                  <button
                    onClick={() => handleRemoveMember(member.user_id)}
                    className="text-sm text-destructive hover:underline"
                  >
                    {t(dict, "remove", "Remove")}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "requests" && room.is_owner && (
        <div className="space-y-2">
          {requests.length > 0 && (
            <button
              onClick={handleApproveAll}
              disabled={is_actionLoading}
              className="w-full mb-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {t(dict, "approveAll", "Approve All")}
            </button>
          )}
          {requests.map((request) => (
            <div
              key={request.user_id}
              className="flex items-center justify-between p-3 bg-card border border-border rounded-lg"
            >
              <div>
                <p className="font-medium">{request.name}</p>
                <p className="text-sm text-muted-foreground">@{request.username}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(request.user_id)}
                  disabled={is_actionLoading}
                  className="text-sm text-primary hover:underline"
                >
                  {t(dict, "approve", "Approve")}
                </button>
                <button
                  onClick={() => handleReject(request.user_id)}
                  disabled={is_actionLoading}
                  className="text-sm text-destructive hover:underline"
                >
                  {t(dict, "reject", "Reject")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RoomDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col flex-1 p-4">
          <div className="animate-pulse h-8 w-24 bg-zinc-200 rounded mb-4" />
          <div className="animate-pulse h-32 bg-zinc-200 rounded" />
        </div>
      }
    >
      <RoomDetailContent />
    </Suspense>
  );
}