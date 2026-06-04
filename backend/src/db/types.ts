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
  credit_score: number;
  credit_score_reset_at: Date;
}

export interface CreditScoreLogRow {
  uuid: string;
  room_id: string;
  target_user_id: string;
  reporter_id: string;
  reason:
    | "late" | "last_minute_cancel" | "ghost" | "no_show" | "early_leave" | "midway_leave"
    | "proxy_register" | "bring_extra"
    | "attack" | "harassment" | "verbal_abuse" | "property_damage" | "discrimination" | "rule_violation"
    | "payment_default" | "payment_dispute"
    | "bonus";
  points_change: number;
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

export interface RoomMessageRow {
  id: number;
  room_id: string;
  user_id: string;
  body: string;
  created_at: Date;
}

export interface PushSubscriptionRow {
  uuid: string;
  user_id: string;
  endpoint: string;
  platform: "web" | "fcm" | "apns";
  p256dh: string | null;
  auth: string | null;
  created_at: Date;
  updated_at: Date;
}
