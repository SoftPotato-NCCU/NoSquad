export type RoomStatus =
  | "open"
  | "recruiting_closed"
  | "in_progress"
  | "ended"
  | "cancelled";

export type MembershipStatus = "approved" | "pending" | "rejected";

export type RoomCategory = "sports" | "study" | "entertainment" | "social";

export interface BaseRoom {
  id: string;
  name: string;
  description: string | null;
  room_status: RoomStatus;
  member_count: number;
  max_capacity: number;
  join_approval_required: boolean;
  created_at: string;
  category: RoomCategory | null;
}

export interface MyRoom extends BaseRoom {
  event_time: string | null;
  event_end_time: string | null;
  location: string | null;
  is_owner: boolean;
  membership_status: MembershipStatus;
}

export interface HallRoom extends BaseRoom {
  location: string | null;
  is_joined: boolean;
  is_full: boolean;
}

export interface RoomDetails extends BaseRoom {
  event_time: string | null;
  event_end_time: string | null;
  location: string | null;
  is_owner: boolean;
  is_member: boolean;
  membership_status: MembershipStatus | null;
  owner_credit_score: number;
}

export type ViolationReason =
  | "late" | "last_minute_cancel" | "ghost" | "no_show" | "early_leave" | "midway_leave"
  | "proxy_register" | "bring_extra"
  | "attack" | "harassment" | "verbal_abuse" | "property_damage" | "discrimination" | "rule_violation"
  | "payment_default" | "payment_dispute";

export interface CreditScoreMember {
  user_id: string;
  name: string;
  username: string;
  credit_score: number;
  joined_at: string;
}

export interface MemberEvaluation {
  user_id: string;
  violations: ViolationReason[];
}

export interface EvaluateResponse {
  success: boolean;
  results: Array<{
    user_id: string;
    points_change: number;
    new_credit_score: number;
  }>;
}

export interface RoomMember {
  user_id: string;
  name: string;
  username: string;
  approval_status: MembershipStatus;
  joined_at: string;
  is_owner: boolean;
  credit_score?: number;
}

export interface JoinRequest {
  user_id: string;
  name: string;
  username: string;
  approval_status: "pending";
  joined_at: string;
  is_owner: boolean;
}

export interface Pagination {
  has_next: boolean;
  next_cursor: string | null;
  limit: number;
}

export interface RoomsResponse {
  rooms: MyRoom[];
  pagination: Pagination;
}

export interface RoomHallResponse {
  rooms: HallRoom[];
  pagination: Pagination;
}

export interface RoomDetailsResponse {
  room: RoomDetails;
}

export interface MembersResponse {
  members: RoomMember[];
  room_owner_id: string;
}

export interface RequestsResponse {
  requests: JoinRequest[];
}

export interface CreateRoomRequest {
  name: string;
  description?: string;
  max_capacity?: number;
  join_approval_required?: boolean;
  event_time: string;
  event_end_time?: string;
  location?: string;
}

export interface UpdateRoomRequest {
  name?: string;
  description?: string | null;
  max_capacity?: number;
  join_approval_required?: boolean;
  event_time?: string | null;
  event_end_time?: string | null;
  location?: string | null;
}

export interface JoinRoomResponse {
  success: boolean;
  room_id: string;
  status: "approved" | "pending";
}

export interface GenericSuccessResponse {
  success: boolean;
  room_id?: string;
  user_id?: string;
  message?: string;
  status?: RoomStatus;
}