import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Widget = {
  id: string;
  name: string;
  domain: string;
  vertical: string;
  is_active: boolean;
  created_at: string;
  user_id: string;
};

export type Conversation = {
  id: string;
  widget_id: string;
  visitor_id: string;
  status: "active" | "qualified" | "disqualified" | "abandoned";
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  role: "bot" | "user";
  content: string;
  created_at: string;
};

export type Lead = {
  id: string;
  conversation_id: string;
  widget_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  score: number;
  meeting_booked: boolean;
  created_at: string;
};
