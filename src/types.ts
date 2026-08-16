export type Priority = 'critical' | 'high' | 'medium' | 'low' | 'needs_review';

export type Category =
  | 'vehicle_breakdown'
  | 'delivery_delay'
  | 'pickup_issue'
  | 'vendor_issue'
  | 'customer_escalation'
  | 'delivery_confirmation'
  | 'routine_update'
  | 'other';

export interface TriagedMessage {
  id?: string;
  run_id?: string;
  original_message: string;
  priority: Priority;
  category: Category;
  reason: string;
  recommended_action: string;
  draft_reply: string;
  confidence: number;
  missing_information: string[];
  created_at?: string;
  // Local edit tracking
  user_edited_reply?: string;
}

export interface TriageRun {
  id: string;
  raw_input: string;
  created_at: string;
  messages: TriagedMessage[];
  saved_to_db: boolean;
  db_error?: string;
}

export interface TriageStats {
  action_now: number;     // Critical + High
  review_today: number;   // Medium + Needs Review
  can_wait: number;       // Low
  critical: number;
  high: number;
  medium: number;
  needs_review: number;
  low: number;
  total: number;
}

export interface AnalyzeRequest {
  messages: string[];
  raw_input: string;
}

export interface AnalyzeResponse {
  run_id: string;
  messages: TriagedMessage[];
  created_at: string;
  saved_to_db: boolean;
  db_error?: string;
  error?: string;
}
