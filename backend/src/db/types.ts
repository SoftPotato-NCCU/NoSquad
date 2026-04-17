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
}

export interface RoomRow {
  uuid: string;
  title: string;
  description: string | null;
  status: 'active' | 'closed';
  creator_id: string;
  max_members: number;
  event_time: Date | null;
  event_end_time: Date | null;
  location: string | null;
  created_at: Date;
}

export interface RoomMemberRow {
  room_id: string;
  user_id: string;
  joined_at: Date;
}

export interface UserTokenRow {
  uuid: string;
  user_id: string;
  token: string;
  device_type: string | null;
  device_name: string | null;
  created_at: Date;
  last_used_at: Date | null;
  expires_at: Date | null;
  revoked_at: Date | null;
}
