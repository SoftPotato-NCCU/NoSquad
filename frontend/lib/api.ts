import {
  CreateRoomRequest,
  GenericSuccessResponse,
  HallRoom,
  JoinRequest,
  JoinRoomResponse,
  MembersResponse,
  MyRoom,
  RoomDetails,
  RoomHallResponse,
  RoomMember,
  RequestsResponse,
  RoomsResponse,
  RoomCategory,
  RoomSortField,
  SortOrder,
  UpdateRoomRequest,
  WaitlistResponse,
} from "../types/rooms";

const API_BASE = process.env.NEXT_PUBLIC_API_BACKEND_URL || "";

const AUTH_ERROR_CODES = [
  "UNAUTHORIZED",
  "INVALID_TOKEN",
  "TOKEN_EXPIRED",
  "USER_NOT_FOUND",
];

function isAuthError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "error" in error &&
    typeof error.error === "object" &&
    error.error !== null &&
    "code" in error.error &&
    typeof error.error.code === "string" &&
    AUTH_ERROR_CODES.includes(error.error.code)
  );
}

export function handleAuthError(error: unknown): boolean {
  if (isAuthError(error)) {
    clearToken();
    localStorage.removeItem("user");
    window.location.href = "/";
    return true;
  }
  return false;
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  requireAuth: boolean = true,
): Promise<T> {
  const url = `${API_BASE}/api/v1${endpoint}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (requireAuth) {
    const token = getToken();
    if (!token) {
      throw {
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      };
    }
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 && requireAuth) {
    clearToken();
    localStorage.removeItem("user");
    window.location.href = "/auth/login";
    throw {
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    };
  }

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: { message: "Request failed" } }));
    if (requireAuth && isAuthError(error)) {
      clearToken();
      localStorage.removeItem("user");
      window.location.href = "/auth/login";
    }
    throw error;
  }

  return response.json();
}

export async function publicFetch<T>(
  endpoint: string,
  options: RequestInit = {},
) {
  return fetchApi<T>(endpoint, options, false);
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}) {
  return fetchApi<T>(endpoint, options, true);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("access_token", token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
}

export async function login(identifier: string, password: string) {
  return publicFetch<{
    data: {
      user: {
        id: string;
        name: string;
        username: string;
        email: string;
        phone: string;
      };
      access_token: string;
    };
  }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
}

export async function register(data: {
  name: string;
  username: string;
  email: string;
  phone: string;
  password: string;
}) {
  return publicFetch<{
    data: {
      user: {
        id: string;
        name: string;
        username: string;
        email: string;
        phone: string;
      };
      access_token: string;
    };
  }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function logout() {
  const result = await apiFetch<{
    data: { success: boolean; message: string };
  }>("/auth/logout", { method: "POST" });
  clearToken();
  return result;
}

export async function getMe() {
  return apiFetch<{
    data: {
      user: {
        id: string;
        name: string;
        username: string;
        email: string;
        phone: string;
      };
    };
  }>("/auth/me");
}

export type { CreateRoomRequest, UpdateRoomRequest } from "../types/rooms";

export async function listMyRooms(params?: {
  limit?: number;
  cursor?: string;
  include_pending?: boolean;
}): Promise<{ data: RoomsResponse }> {
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.cursor) query.set("cursor", params.cursor);
  if (params?.include_pending) query.set("include_pending", "true");

  const endpoint = `/rooms${query.toString() ? `?${query.toString()}` : ""}`;
  return apiFetch<{ data: RoomsResponse }>(endpoint);
}

export async function listRoomHall(params?: {
  limit?: number;
  cursor?: string;
  include_joined?: boolean;
  include_full?: boolean;
  category?: RoomCategory | null;
  q?: string;
  sort_by?: RoomSortField;
  order?: SortOrder;
}): Promise<{ data: RoomHallResponse }> {
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.cursor) query.set("cursor", params.cursor);
  if (params?.include_joined) query.set("include_joined", "true");
  if (params?.include_full) query.set("include_full", "true");
  if (params?.category) query.set("category", params.category);
  if (params?.q && params.q.trim()) query.set("q", params.q.trim());
  if (params?.sort_by) query.set("sort_by", params.sort_by);
  if (params?.order) query.set("order", params.order);

  const endpoint = `/rooms/hall${query.toString() ? `?${query.toString()}` : ""}`;
  return apiFetch<{ data: RoomHallResponse }>(endpoint);
}

export async function createRoom(
  data: CreateRoomRequest,
): Promise<{ data: { room: MyRoom } }> {
  return apiFetch<{ data: { room: MyRoom } }>("/rooms", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getRoomDetails(
  roomId: string,
): Promise<{ data: { room: RoomDetails } }> {
  return apiFetch<{ data: { room: RoomDetails } }>(`/rooms/${roomId}`);
}

export async function updateRoom(
  roomId: string,
  data: UpdateRoomRequest,
): Promise<{ data: GenericSuccessResponse }> {
  return apiFetch<{ data: GenericSuccessResponse }>(`/rooms/${roomId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function dismissRoom(
  roomId: string,
): Promise<{ data: GenericSuccessResponse }> {
  return apiFetch<{ data: GenericSuccessResponse }>(`/rooms/${roomId}`, {
    method: "DELETE",
  });
}

export async function joinRoom(
  roomId: string,
): Promise<{ data: JoinRoomResponse }> {
  return apiFetch<{ data: JoinRoomResponse }>(`/rooms/${roomId}/join`, {
    method: "POST",
  });
}

export async function leaveRoom(
  roomId: string,
): Promise<{ data: GenericSuccessResponse }> {
  return apiFetch<{ data: GenericSuccessResponse }>(`/rooms/${roomId}/leave`, {
    method: "POST",
  });
}

export async function listRoomMembers(
  roomId: string,
): Promise<{ data: MembersResponse }> {
  return apiFetch<{ data: MembersResponse }>(`/rooms/${roomId}/members`);
}

export async function listJoinRequests(
  roomId: string,
): Promise<{ data: RequestsResponse }> {
  return apiFetch<{ data: RequestsResponse }>(`/rooms/${roomId}/requests`);
}

export async function approveRequest(
  roomId: string,
  userId: string,
): Promise<{ data: { success: boolean; user_id: string; status: string } }> {
  return apiFetch<{ data: { success: boolean; user_id: string; status: string } }>(
    `/rooms/${roomId}/requests/${userId}/approve`,
    { method: "POST" },
  );
}

export async function rejectRequest(
  roomId: string,
  userId: string,
): Promise<{ data: { success: boolean; user_id: string; status: string } }> {
  return apiFetch<{ data: { success: boolean; user_id: string; status: string } }>(
    `/rooms/${roomId}/requests/${userId}/reject`,
    { method: "POST" },
  );
}

export async function approveAllRequests(
  roomId: string,
): Promise<{ data: { success: boolean; approved_count: number } }> {
  return apiFetch<{ data: { success: boolean; approved_count: number } }>(
    `/rooms/${roomId}/requests/approve-all`,
    { method: "POST" },
  );
}

export async function removeMember(
  roomId: string,
  userId: string,
): Promise<{ data: GenericSuccessResponse }> {
  return apiFetch<{ data: GenericSuccessResponse }>(
    `/rooms/${roomId}/members/${userId}`,
    { method: "DELETE" },
  );
}

export async function listWaitlist(
  roomId: string,
): Promise<{ data: WaitlistResponse }> {
  return apiFetch<{ data: WaitlistResponse }>(`/rooms/${roomId}/waitlist`);
}

export async function promoteFromWaitlist(
  roomId: string,
  userId: string,
): Promise<{ data: { success: boolean; user_id: string; status: string } }> {
  return apiFetch<{ data: { success: boolean; user_id: string; status: string } }>(
    `/rooms/${roomId}/waitlist/${userId}/promote`,
    { method: "POST" },
  );
}

export async function closeRecruiting(
  roomId: string,
): Promise<{ data: GenericSuccessResponse }> {
  return apiFetch<{ data: GenericSuccessResponse }>(
    `/rooms/${roomId}/recruiting/close`,
    { method: "POST" },
  );
}

export async function openRecruiting(
  roomId: string,
): Promise<{ data: GenericSuccessResponse }> {
  return apiFetch<{ data: GenericSuccessResponse }>(
    `/rooms/${roomId}/recruiting/open`,
    { method: "POST" },
  );
}