const API_URL: string =
  (import.meta.env["VITE_API_URL"] as string | undefined) ?? "http://127.0.0.1:8001";

async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (err: unknown) {
    if (err instanceof TypeError && err.message.toLowerCase().includes("fetch")) {
      throw new Error(
        "Unable to connect to MeetingMind server. Please ensure the backend is running on port 8001.",
      );
    }
    throw err;
  }
}

export type AnalyticsResponse = {
  meetings: Record<string, number>;
  actions: Record<string, number>;
  decisions?: Record<string, number>;
};

export type RecentSummaryItem = {
  id: string;
  filename: string;
  status: string;
  processing_stage?: string;
  error_message?: string | null;
  duration_seconds?: number;
  summary?: string;
  decision_count?: number;
  action_item_count?: number;
  created_at: string | null;
};

export type DashboardStats = {
  total_meetings: number;
  processed_meetings: number;
  processing_meetings?: number;
  failed_meetings?: number;
  average_duration_seconds: number;
  action_items: number;
  completed_action_items: number;
  pending_action_items: number;
  completion_rate: number;
  recent_summaries?: RecentSummaryItem[];
};

export type MomSections = {
  discussion: string[];
  decisions: string[];
  actions: string[];
  deadlines: string[];
};

export type TranscriptSegment = {
  index: number;
  start: number;
  end: number;
  timestamp: string;
  speaker: string;
  text: string;
};

export type MeetingItem = {
  id: string;
  user_id?: string | null;
  filename: string;
  duration_seconds?: number;
  processing_time_seconds?: number;
  status: string;
  processing_stage?: string;
  error_message?: string | null;
  created_at: string | null;
  transcript?: string;
  transcript_segments?: TranscriptSegment[];
  summary?: string;
  summary_preview?: string;
  mom?: string;
  mom_sections?: MomSections;
  decision_count?: number;
  action_item_count?: number;
  action_item_status_map?: Record<string, string>;
  has_audio?: boolean;
  audio_url?: string | null;
};

export type MeetingsResponse = {
  meetings: MeetingItem[];
  total: number;
  page: number;
  limit: number;
};

export type UploadMeetingResponse = {
  message: string;
  meeting_id: string;
  filename: string;
  saved_path?: string;
  audio_path?: string;
  duration_seconds?: number;
  processing_time_seconds?: number;
  status: string;
  processing_stage?: string;
};

export type ActionItem = {
  id: string;
  task: string;
  owner: string;
  deadline: string;
  status: "Pending" | "Completed" | string;
  priority: string;
  meeting: string;
  meeting_id: string;
  created_at: string | null;
};

export type ActionItemsResponse = {
  action_items: ActionItem[];
  total: number;
};

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin" | string;
  is_active?: boolean;
  created_at: string | null;
};

export type AdminStats = {
  total_users: number;
  active_users: number;
  admin_users: number;
  total_meetings: number;
  completed_meetings: number;
  processed_meetings: number;
  processing_meetings: number;
  failed_meetings: number;
};

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  is_active: boolean;
  meeting_count: number;
  last_login_at?: string | null;
  created_at: string | null;
};

export type AdminUserDetails = AdminUser & {
  recent_meetings: Array<{
    id: string;
    filename: string;
    status: string;
    duration_seconds: number;
    created_at: string | null;
  }>;
};

export type AdminUsersResponse = {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
};

export type AdminMeetingItem = {
  id: string;
  filename: string;
  user_id?: string | null;
  owner_email: string;
  owner_name: string;
  duration_seconds: number;
  processing_time_seconds: number;
  status: string;
  processing_stage?: string;
  error_message?: string | null;
  decision_count: number;
  action_item_count: number;
  created_at: string | null;
};

export type AdminMeetingsResponse = {
  meetings: AdminMeetingItem[];
  total: number;
  page: number;
  limit: number;
};

function getToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("meetiq_token") : null;
}

function getRole(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("meetiq_role") : null;
}

export function getAuthToken(): string | null {
  return getToken();
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

export function isAdmin(): boolean {
  return getRole() === "admin";
}

export function clearLocalSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("meetiq_token");
  localStorage.removeItem("meetiq_email");
  localStorage.removeItem("meetiq_name");
  localStorage.removeItem("meetiq_role");
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response, skipAuthRedirect = false): Promise<T> {
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;

    try {
      const body = (await res.json()) as { detail?: string; message?: string };
      detail = body.detail ?? body.message ?? detail;
    } catch {
      /* Ignore response parsing errors */
    }

    if (res.status === 401 && !skipAuthRedirect && typeof window !== "undefined") {
      clearLocalSession();
      const path = window.location.pathname;
      if (
        path !== "/login" &&
        path !== "/register" &&
        path !== "/forgot-password" &&
        path !== "/reset-password" &&
        path !== "/"
      ) {
        window.location.href = "/login";
      }
    }

    throw new Error(detail);
  }

  return res.json() as Promise<T>;
}

export async function checkBackend() {
  const res = await apiFetch(`${API_URL}/api/health`);
  return handleResponse<{ status: string; message: string }>(res, true);
}

export async function loginUser(email: string, password: string) {
  const res = await apiFetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await handleResponse<{
    access_token: string;
    token_type: string;
    user_id: string;
    email: string;
    name: string;
    role: string;
  }>(res, true);

  localStorage.setItem("meetiq_token", data.access_token);
  localStorage.setItem("meetiq_email", data.email);
  localStorage.setItem("meetiq_name", data.name || "");
  localStorage.setItem("meetiq_role", data.role);

  return data;
}

export async function registerUser(email: string, password: string, name: string) {
  const res = await apiFetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });

  return handleResponse<{
    message: string;
    user_id: string;
    email: string;
    name: string;
  }>(res, true);
}

export async function logoutUser(): Promise<void> {
  const token = getToken();
  if (token) {
    try {
      await apiFetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        headers: { ...authHeaders() },
      });
    } catch {
      /* Ignore network errors during logout */
    }
  }
  clearLocalSession();
}

export async function getMe(): Promise<UserProfile> {
  const res = await apiFetch(`${API_URL}/api/auth/me`, {
    headers: { ...authHeaders() },
  });

  const profile = await handleResponse<UserProfile>(res);
  if (typeof window !== "undefined") {
    localStorage.setItem("meetiq_email", profile.email);
    localStorage.setItem("meetiq_name", profile.name || "");
    localStorage.setItem("meetiq_role", profile.role);
  }
  return profile;
}

export async function updateProfile(name: string): Promise<UserProfile> {
  const res = await apiFetch(`${API_URL}/api/auth/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ name }),
  });

  const updated = await handleResponse<UserProfile>(res);
  if (typeof window !== "undefined") {
    localStorage.setItem("meetiq_name", updated.name || "");
  }
  return updated;
}

export async function changePassword(current_password: string, new_password: string) {
  const res = await apiFetch(`${API_URL}/api/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ current_password, new_password }),
  });

  return handleResponse<{ message: string }>(res, true);
}

export async function forgotPassword(email: string) {
  const res = await apiFetch(`${API_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  return handleResponse<{
    message: string;
    smtp_configured: boolean;
  }>(res, true);
}

export async function verifyResetToken(token: string) {
  const params = new URLSearchParams({ token });
  const res = await apiFetch(`${API_URL}/api/auth/reset-password/verify?${params.toString()}`);
  return handleResponse<{ valid: boolean }>(res, true);
}

export async function resetPassword(token: string, new_password: string) {
  const res = await apiFetch(`${API_URL}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password }),
  });

  return handleResponse<{ message: string }>(res, true);
}

export async function uploadMeeting(file: File): Promise<UploadMeetingResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await apiFetch(`${API_URL}/api/upload`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: formData,
  });

  return handleResponse<UploadMeetingResponse>(res);
}

export function uploadMeetingWithProgress(
  file: File,
  onUploadProgress?: (percent: number) => void,
  background = true,
): Promise<UploadMeetingResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${API_URL}/api/upload${background ? "?background=true" : ""}`;
    xhr.open("POST", url, true);

    const token = getToken();
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onUploadProgress) {
        const pct = Math.min(100, Math.round((event.loaded / event.total) * 100));
        onUploadProgress(pct);
      }
    };

    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(body as UploadMeetingResponse);
        } else {
          if (xhr.status === 401) {
            clearLocalSession();
          }
          reject(new Error(body.detail || body.message || `Upload failed (HTTP ${xhr.status})`));
        }
      } catch {
        reject(new Error(`Upload failed (HTTP ${xhr.status})`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error while uploading file. Verify backend connection."));
    };

    const formData = new FormData();
    formData.append("file", file);
    xhr.send(formData);
  });
}

export function getAudioUrl(meetingId: string): string {
  const token = getToken();
  return `${API_URL}/api/meetings/${meetingId}/audio${token ? `?token=${encodeURIComponent(token)}` : ""}`;
}

export async function getMeetings(
  page?: number,
  limit?: number,
  q?: string,
  status?: string,
): Promise<MeetingsResponse> {
  const params = new URLSearchParams();

  if (page !== undefined) params.set("page", String(page));
  if (limit !== undefined) params.set("limit", String(limit));
  if (q && q.trim()) params.set("q", q.trim());
  if (status && status !== "All") params.set("status", status.toLowerCase());

  const query = params.toString() ? `?${params.toString()}` : "";

  const res = await apiFetch(`${API_URL}/api/meetings${query}`, {
    headers: { ...authHeaders() },
  });

  return handleResponse<MeetingsResponse>(res);
}

export async function getMeeting(id: string): Promise<MeetingItem> {
  const res = await apiFetch(`${API_URL}/api/meetings/${id}`, {
    headers: { ...authHeaders() },
  });

  return handleResponse<MeetingItem>(res);
}

export async function updateMeeting(
  id: string,
  data: { filename?: string; summary?: string; mom?: string },
): Promise<{
  message: string;
  id: string;
  filename: string;
  summary: string;
  mom: string;
  mom_sections?: MomSections;
}> {
  const res = await apiFetch(`${API_URL}/api/meetings/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(data),
  });

  return handleResponse(res);
}

export async function retryMeeting(id: string, background = false): Promise<UploadMeetingResponse> {
  const res = await apiFetch(
    `${API_URL}/api/meetings/${id}/retry${background ? "?background=true" : ""}`,
    {
      method: "POST",
      headers: { ...authHeaders() },
    },
  );

  return handleResponse<UploadMeetingResponse>(res);
}

export async function deleteMeeting(id: string) {
  const res = await apiFetch(`${API_URL}/api/meetings/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });

  return handleResponse<{ message: string }>(res);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await apiFetch(`${API_URL}/api/dashboard/stats`, {
    headers: { ...authHeaders() },
  });

  return handleResponse<DashboardStats>(res);
}

export async function getAnalytics(): Promise<AnalyticsResponse> {
  const res = await apiFetch(`${API_URL}/api/analytics`, {
    headers: { ...authHeaders() },
  });

  return handleResponse<AnalyticsResponse>(res);
}

export async function getActionItems(): Promise<ActionItemsResponse> {
  const res = await apiFetch(`${API_URL}/api/action-items`, {
    headers: { ...authHeaders() },
  });

  return handleResponse<ActionItemsResponse>(res);
}

export async function updateActionItemStatus(
  meetingId: string,
  task: string,
  status: "Pending" | "Completed",
): Promise<{ message: string; status: string }> {
  const res = await apiFetch(`${API_URL}/api/action-items/${meetingId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ task, status }),
  });

  return handleResponse<{ message: string; status: string }>(res);
}

export async function adminGetStats(): Promise<AdminStats> {
  const res = await apiFetch(`${API_URL}/api/admin/stats`, {
    headers: { ...authHeaders() },
  });

  return handleResponse<AdminStats>(res);
}

export async function adminGetUsers(
  q?: string,
  page?: number,
  limit?: number,
  role?: string,
  status?: string,
): Promise<AdminUsersResponse> {
  const params = new URLSearchParams();

  if (q && q.trim()) params.set("q", q.trim());
  if (role && role !== "all") params.set("role", role);
  if (status && status !== "all") params.set("status", status);
  if (page !== undefined) params.set("page", String(page));
  if (limit !== undefined) params.set("limit", String(limit));

  const query = params.toString() ? `?${params.toString()}` : "";

  const res = await apiFetch(`${API_URL}/api/admin/users${query}`, {
    headers: { ...authHeaders() },
  });

  return handleResponse<AdminUsersResponse>(res);
}

export async function adminGetUserDetails(userId: string): Promise<AdminUserDetails> {
  const res = await apiFetch(`${API_URL}/api/admin/users/${userId}`, {
    headers: { ...authHeaders() },
  });

  return handleResponse<AdminUserDetails>(res);
}

export async function adminUpdateRole(userId: string, role: "user" | "admin") {
  const res = await apiFetch(`${API_URL}/api/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ role }),
  });

  return handleResponse<{ message: string }>(res);
}

export async function adminUpdateUserStatus(userId: string, is_active: boolean) {
  const res = await apiFetch(`${API_URL}/api/admin/users/${userId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ is_active }),
  });

  return handleResponse<{ message: string; is_active: boolean }>(res);
}

export async function adminDeleteUser(userId: string) {
  const res = await apiFetch(`${API_URL}/api/admin/users/${userId}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });

  return handleResponse<{ message: string }>(res);
}

export async function adminGetMeetings(
  q?: string,
  status?: string,
  page?: number,
  limit?: number,
  userId?: string,
): Promise<AdminMeetingsResponse> {
  const params = new URLSearchParams();

  if (q && q.trim()) params.set("q", q.trim());
  if (status && status !== "all") params.set("status", status);
  if (userId && userId.trim()) params.set("user_id", userId.trim());
  if (page !== undefined) params.set("page", String(page));
  if (limit !== undefined) params.set("limit", String(limit));

  const query = params.toString() ? `?${params.toString()}` : "";

  const res = await apiFetch(`${API_URL}/api/admin/meetings${query}`, {
    headers: { ...authHeaders() },
  });

  return handleResponse<AdminMeetingsResponse>(res);
}

export async function adminDeleteMeeting(meetingId: string) {
  const res = await apiFetch(`${API_URL}/api/admin/meetings/${meetingId}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });

  return handleResponse<{ message: string }>(res);
}
