"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useRooms } from "@/lib/rooms-context";
import { useDictionary, t } from "@/lib/i18n/useDictionary";
import RoomCard from "@/components/rooms/RoomCard";
import CreateRoomModal from "@/components/rooms/CreateRoomModal";
import type { MyRoom } from "@/types/rooms";

function AuthenticatedHome() {
  const { user } = useAuth();
  const { myRooms, fetchRooms, createRoom: createRoomAPI, joinRoom: joinRoomAPI, leaveRoom: leaveRoomAPI, isLoading } = useRooms();
  const { dict } = useDictionary("home");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchRooms(true);
    }
  }, [user, fetchRooms]);

  const handleCreateRoom = async (data: { name: string; description?: string; max_capacity?: number; join_approval_required?: boolean }) => {
    setIsCreating(true);
    try {
      await createRoomAPI(data);
      await fetchRooms(true);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = async (roomId: string) => {
    await joinRoomAPI(roomId);
    await fetchRooms(true);
  };

  const handleLeave = async (roomId: string) => {
    await leaveRoomAPI(roomId);
    await fetchRooms(true);
  };

  const approvedRooms = myRooms.filter((r) => r.membership_status === "approved");
  const pendingRooms = myRooms.filter((r) => r.membership_status === "pending");

  return (
    <div className="flex flex-col flex-1 p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-[clamp(1.25rem,1.6vw,2rem)] font-semibold">
          {t(dict, "title", "Home")}
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors"
        >
          + {t(dict, "createRoom", "Create")}
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : approvedRooms.length === 0 && pendingRooms.length === 0 ? (
        <div className="flex flex-col flex-1 items-center justify-center text-center py-8">
          <p className="text-muted-foreground mb-4">
            {t(dict, "noRooms", "You haven't joined any rooms yet")}
          </p>
          <Link
            href="/explore"
            className="text-primary hover:underline"
          >
            {t(dict, "roomHall", "Explore Rooms")}
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {pendingRooms.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-muted-foreground mb-2">
                {t(dict, "pendingApproval", "Pending Approval")}
              </h2>
              <div className="space-y-3">
                {pendingRooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    variant="my"
                    onLeave={handleLeave}
                  />
                ))}
              </div>
            </section>
          )}

          {approvedRooms.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-muted-foreground mb-2">
                {t(dict, "yourRooms", "Your Rooms")}
              </h2>
              <div className="space-y-3">
                {approvedRooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    variant="my"
                    onLeave={!room.is_owner ? handleLeave : undefined}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateRoom}
      />
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
          <p className="text-[clamp(0.95rem,1.1vw,1.25rem)] text-zinc-400 dark:text-zinc-500">
            {t(dict, "tagline", "Find and organize group activities")}
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full">
          <Link
            href="/auth/login"
            className="flex items-center justify-center h-[clamp(3rem,3.2vw,3.75rem)] w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-full hover:opacity-90 transition-opacity text-[clamp(1rem,1.1vw,1.25rem)]"
          >
            {t(dict, "login", "Log In")}
          </Link>
          <Link
            href="/auth/signup"
            className="flex items-center justify-center h-[clamp(3rem,3.2vw,3.75rem)] w-full border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-[clamp(1rem,1.1vw,1.25rem)]"
          >
            {t(dict, "signup", "Sign Up")}
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
    <Suspense
      fallback={
        <div className="flex flex-col flex-1 items-center justify-center p-4">
          <div className="animate-spin w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}