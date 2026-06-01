export interface UserRow {
  uuid: string;
  name: string;
  username: string;
  phone: string;
  email: string;
  hashed_password: string;
  last_activity: Date | null;
  created_at: Date;
  rating_avg: number;
  rating_count: number;
  points: number;
  points_reset_at: Date;
}

export interface ReportRow {
  uuid: string;
  room_id: string;
  reporter_id: string;
  reported_id: string;
  reason: 'late' | 'absent' | 'harassing' | 'other';
  status: 'pending' | 'approved' | 'rejected';
  created_at: Date;
  resolved_at: Date | null;
  resolved_by: string | null;
}

export interface PointTransactionRow {
  uuid: string;
  user_id: string;
  delta: number;
  reason: 'attendance' | 'late' | 'absent' | 'harassing' | 'other' | 'reset';
  room_id: string | null;
  report_id: string | null;
  created_at: Date;
}

export interface RoomRow {
  uuid: string;
  title: string;
  description: string | null;
  status: "open" | "recruiting_closed" | "ended" | "cancelled";
  creator_id: string;
  max_members: number;
  join_approval_required: boolean;
  event_time: Date | null;
  event_end_time: Date | null;
  location: string | null;
  category: "sports" | "study" | "entertainment" | "social" | null;
  created_at: Date;
}

export interface RoomMemberRow {
  room_id: string;
  user_id: string;
  approval_status: "approved" | "pending" | "rejected";
  joined_at: Date;
}

export interface UserTokenRow {
  uuid: string;
  user_id: string;
  token: string;
  user_agent: string | null;
  ip_address: string | null;
  created_at: Date;
  last_used_at: Date | null;
  expires_at: Date | null;
  revoked_at: Date | null;
}
