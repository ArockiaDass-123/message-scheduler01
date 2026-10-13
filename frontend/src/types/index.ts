export interface User {
  id: number;
  email: string;
  full_name: string;
  picture?: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
}

export interface Recipient {
  id: number;
  name: string;
  email: string;
  whatsapp?: string;
  created_at: string;
}

export interface Workspace {
  id: number;
  name: string;
  description?: string;
  subject: string;
  message: string;
  send_email: boolean;
  send_whatsapp: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
  recipient_count: number;
  scheduled_count: number;
  sent_count: number;
  pending_count: number;
  next_scheduled_at?: string | null;
}

export interface WorkspaceDetail extends Workspace {
  recipients: Recipient[];
  selected_recipient_ids: number[];
}

export interface Schedule {
  id: number;
  workspace_id: number;
  workspace_name?: string;
  scheduled_at: string;
  recurrence_type: 'once' | 'monthly' | 'custom';
  status: 'Scheduled' | 'Sending' | 'Sent' | 'Failed' | 'Cancelled';
  retry_count: number;
  error_reason?: string;
  recipient_count?: number;
  created_at: string;
}

export interface MessageLog {
  id: number;
  workspace_id: number;
  schedule_id?: number;
  recipient_name?: string;
  recipient_destination?: string;
  channel: 'email' | 'whatsapp';
  status: 'Sent' | 'Failed';
  sent_at: string;
  error_message?: string;
  subject_snapshot?: string;
  message_snapshot?: string;
}

export interface Integration {
  provider: 'gmail' | 'whatsapp';
  status: 'connected' | 'disconnected' | 'error';
  account_info?: string;
  updated_at?: string;
}

export interface DashboardSummary {
  today: Schedule[];
  upcoming: Schedule[];
  recently_sent: Schedule[];
}
