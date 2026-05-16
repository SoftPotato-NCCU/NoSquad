"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  listMyRooms,
  createRoom,
  joinRoom,
  leaveRoom,
  dismissRoom,
  getRoomDetails,
} from "./api";
import type {
  MyRoom,
  RoomDetails,
  CreateRoomRequest,
} from "../types/rooms";

interface RoomsContextType {
  myRooms: MyRoom[];
  isLoading: boolean;
  error: string | null;
  fetchRooms: (includePending?: boolean) => Promise<void>;
  createRoom: (data: CreateRoomRequest) => Promise<MyRoom>;
  joinRoom: (roomId: string) => Promise<"approved" | "pending">;
  leaveRoom: (roomId: string) => Promise<void>;
  dismissRoom: (roomId: string) => Promise<void>;
  getRoomDetails: (roomId: string) => Promise<RoomDetails>;
}

const RoomsContext = createContext<RoomsContextType | null>(null);

export function RoomsProvider({ children }: { children: ReactNode }) {
  const [myRooms, setMyRooms] = useState<MyRoom[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRooms = useCallback(async (includePending = true) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await listMyRooms({ include_pending: includePending });
      setMyRooms(response.data.rooms);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch rooms");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCreateRoom = useCallback(async (data: CreateRoomRequest) => {
    const response = await createRoom(data);
    setMyRooms((prev) => [response.data.room, ...prev]);
    return response.data.room;
  }, []);

  const handleJoinRoom = useCallback(async (roomId: string) => {
    const response = await joinRoom(roomId);
    return response.data.status;
  }, []);

  const handleLeaveRoom = useCallback(async (roomId: string) => {
    await leaveRoom(roomId);
    setMyRooms((prev) => prev.filter((r) => r.id !== roomId));
  }, []);

  const handleDismissRoom = useCallback(async (roomId: string) => {
    await dismissRoom(roomId);
    setMyRooms((prev) => prev.filter((r) => r.id !== roomId));
  }, []);

  const handleGetRoomDetails = useCallback(async (roomId: string) => {
    const response = await getRoomDetails(roomId);
    return response.data.room;
  }, []);

  return (
    <RoomsContext.Provider
      value={{
        myRooms,
        isLoading,
        error,
        fetchRooms,
        createRoom: handleCreateRoom,
        joinRoom: handleJoinRoom,
        leaveRoom: handleLeaveRoom,
        dismissRoom: handleDismissRoom,
        getRoomDetails: handleGetRoomDetails,
      }}
    >
      {children}
    </RoomsContext.Provider>
  );
}

export function useRooms() {
  const context = useContext(RoomsContext);
  if (!context) {
    throw new Error("useRooms must be used within RoomsProvider");
  }
  return context;
}