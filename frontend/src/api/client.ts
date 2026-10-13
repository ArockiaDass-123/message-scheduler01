import { User, Workspace, WorkspaceDetail, Recipient, Schedule, MessageLog, Integration, DashboardSummary } from '../types';

const getApiBase = (): string => {
  const raw = (import.meta.env.VITE_API_BASE as string | undefined)?.trim();
  if (!raw) return '/api';
  let url = raw;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url.endsWith('/api') ? url : `${url.replace(/\/+$/, '')}/api`;
};

const API_BASE = getApiBase();

class ApiClient {
  private tokenKey = 'msg_scheduler_token';

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token: string) {
    localStorage.setItem(this.tokenKey, token);
  }

  clearToken() {
    localStorage.removeItem(this.tokenKey);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      this.clearToken();
      // Only redirect if not already on login
      if (!window.location.pathname.includes('/login')) {
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
      throw new Error('Session expired. Please log in again.');
    }

    if (!res.ok) {
      let errorMsg = 'An error occurred';
      try {
        const errorData = await res.json();
        errorMsg = errorData.detail || errorData.message || res.statusText;
      } catch {
        errorMsg = await res.text() || res.statusText;
      }
      throw new Error(errorMsg);
    }

    return res.json();
  }

  // --- Auth ---
  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const data = await this.request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async register(email: string, password: string, full_name?: string): Promise<{ access_token: string; user: User }> {
    const data = await this.request<{ access_token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async getGoogleAuthStatus(): Promise<{ configured: boolean; client_id: string; redirect_uri: string }> {
    return this.request('/auth/google/status');
  }

  async getGoogleLoginUrl(redirect_uri?: string): Promise<{ configured: boolean; auth_url: string; client_id?: string; message?: string }> {
    const query = redirect_uri ? `?redirect_uri=${encodeURIComponent(redirect_uri)}` : '';
    return this.request(`/auth/google/url${query}`);
  }

  async configureGoogleOAuth(client_id: string, client_secret: string, redirect_uri?: string): Promise<{ status: string; message: string }> {
    return this.request('/auth/google/configure', {
      method: 'POST',
      body: JSON.stringify({ client_id, client_secret, redirect_uri }),
    });
  }

  async googleCallback(code: string, redirect_uri?: string): Promise<{ access_token: string; user: User; email_connected: boolean; connected_email: string }> {
    const data = await this.request<{ access_token: string; user: User; email_connected: boolean; connected_email: string }>('/auth/google/callback', {
      method: 'POST',
      body: JSON.stringify({ code, redirect_uri }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async googleDirectConnect(email: string, full_name?: string, app_password?: string): Promise<{ access_token: string; user: User; email_connected: boolean; connected_email: string }> {
    const data = await this.request<{ access_token: string; user: User; email_connected: boolean; connected_email: string }>('/auth/google/direct-connect', {
      method: 'POST',
      body: JSON.stringify({ email, full_name, app_password }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async updateTimezone(timezone: string): Promise<{ status: string; timezone: string }> {
    return this.request('/settings/timezone', {
      method: 'PUT',
      body: JSON.stringify({ timezone }),
    });
  }

  // --- Workspaces ---
  async getWorkspaces(): Promise<Workspace[]> {
    return this.request<Workspace[]>('/workspaces');
  }

  async getDashboardSummary(): Promise<DashboardSummary> {
    return this.request<DashboardSummary>('/workspaces/dashboard/summary');
  }

  async getWorkspace(id: number): Promise<WorkspaceDetail> {
    return this.request<WorkspaceDetail>(`/workspaces/${id}`);
  }

  async createWorkspace(data: { name: string; description?: string; subject: string; message: string }): Promise<Workspace> {
    return this.request<Workspace>('/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWorkspace(id: number, data: Partial<Workspace>): Promise<Workspace> {
    return this.request<Workspace>(`/workspaces/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWorkspace(id: number): Promise<{ status: string }> {
    return this.request(`/workspaces/${id}`, { method: 'DELETE' });
  }

  async updateWorkspaceRecipients(workspaceId: number, selections: { recipient_id: number; is_selected: boolean }[]): Promise<any> {
    return this.request(`/workspaces/${workspaceId}/recipients`, {
      method: 'POST',
      body: JSON.stringify(selections),
    });
  }

  // --- Recipients ---
  async getRecipients(): Promise<Recipient[]> {
    return this.request<Recipient[]>('/recipients');
  }

  async createRecipient(data: { name: string; email: string; whatsapp?: string }): Promise<Recipient> {
    return this.request<Recipient>('/recipients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRecipient(id: number, data: Partial<Recipient>): Promise<Recipient> {
    return this.request<Recipient>(`/recipients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRecipient(id: number): Promise<{ status: string }> {
    return this.request(`/recipients/${id}`, { method: 'DELETE' });
  }

  // --- Schedules ---
  async getWorkspaceSchedules(workspaceId: number): Promise<Schedule[]> {
    return this.request<Schedule[]>(`/schedules/workspace/${workspaceId}`);
  }

  async getGlobalSchedules(): Promise<Schedule[]> {
    return this.request<Schedule[]>('/schedules/global');
  }

  async createSingleSchedule(workspaceId: number, scheduled_at: string, recurrence_type: string = 'once'): Promise<Schedule> {
    return this.request<Schedule>(`/schedules/workspace/${workspaceId}/single`, {
      method: 'POST',
      body: JSON.stringify({ scheduled_at, recurrence_type }),
    });
  }

  async createRecurringSchedule(workspaceId: number, data: {
    day_of_month: number;
    time_str: string;
    start_year: number;
    start_month: number;
    months_count: number;
    timezone?: string;
  }): Promise<Schedule[]> {
    return this.request<Schedule[]>(`/schedules/workspace/${workspaceId}/recurring`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createBatchSchedules(workspaceId: number, dates: string[]): Promise<Schedule[]> {
    return this.request<Schedule[]>(`/schedules/workspace/${workspaceId}/batch`, {
      method: 'POST',
      body: JSON.stringify({ dates }),
    });
  }

  async deleteSchedule(scheduleId: number): Promise<any> {
    return this.request(`/schedules/${scheduleId}`, { method: 'DELETE' });
  }

  async retrySchedule(scheduleId: number): Promise<any> {
    return this.request(`/schedules/${scheduleId}/retry`, { method: 'POST' });
  }

  async sendScheduleNow(scheduleId: number): Promise<any> {
    return this.request(`/schedules/${scheduleId}/send-now`, { method: 'POST' });
  }

  // --- History ---
  async getWorkspaceHistory(workspaceId: number): Promise<MessageLog[]> {
    return this.request<MessageLog[]>(`/history/workspace/${workspaceId}`);
  }

  async getGlobalHistory(): Promise<MessageLog[]> {
    return this.request<MessageLog[]>('/history/global');
  }

  async getLogDetail(logId: number): Promise<MessageLog> {
    return this.request<MessageLog>(`/history/detail/${logId}`);
  }

  // --- Settings & Integrations ---
  async getIntegrations(): Promise<Integration[]> {
    return this.request<Integration[]>('/settings/integrations');
  }

  async getGoogleAuthUrl(): Promise<{ configured: boolean; auth_url: string; message?: string }> {
    return this.request('/settings/google/auth-url');
  }

  async connectGmail(data: {
    account_email: string;
    password?: string;
    smtp_host?: string;
    smtp_port?: number;
    sender_name?: string;
    client_id?: string;
    client_secret?: string;
    refresh_token?: string;
  }): Promise<any> {
    return this.request('/settings/google/connect-manual', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async disconnectGmail(): Promise<any> {
    return this.request('/settings/google/disconnect', { method: 'POST' });
  }

  async connectWhatsApp(phone_number_id: string, access_token: string): Promise<any> {
    return this.request('/settings/whatsapp/connect', {
      method: 'POST',
      body: JSON.stringify({ phone_number_id, access_token }),
    });
  }

  async disconnectWhatsApp(): Promise<any> {
    return this.request('/settings/whatsapp/disconnect', { method: 'POST' });
  }

  async sendTestEmail(to_email: string, subject?: string, message?: string): Promise<any> {
    return this.request('/settings/test-email', {
      method: 'POST',
      body: JSON.stringify({ to_email, subject, message }),
    });
  }
}

export const api = new ApiClient();
