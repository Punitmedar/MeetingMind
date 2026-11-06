import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  FileAudio2,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/app-shell";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { StatusBadge } from "@/components/meeting-ui";
import { MetricCard } from "@/components/metric-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type AdminMeetingItem,
  type AdminStats,
  type AdminUser,
  type AdminUserDetails,
  adminDeleteMeeting,
  adminDeleteUser,
  adminGetMeetings,
  adminGetStats,
  adminGetUserDetails,
  adminGetUsers,
  adminUpdateRole,
  adminUpdateUserStatus,
  retryMeeting,
} from "@/lib/api";

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins === 0) return `${secs}s`;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins} min`;
}

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "users" | "meetings">("dashboard");

  return (
    <AppShell>
      <PageHeader
        eyebrow="System Administration"
        title="Admin Governance Panel"
        description="Monitor platform metrics, manage user accounts and access privileges, and oversee all processed or failed meetings."
      />

      {/* Tab Navigation */}
      <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-border bg-primary-soft/35 p-1.5">
        {[
          { id: "dashboard" as const, label: "Admin Dashboard", icon: ShieldCheck },
          { id: "users" as const, label: "User Management", icon: Users },
          { id: "meetings" as const, label: "Meeting Management", icon: FileAudio2 },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-card text-primary shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "dashboard" && (
        <AdminDashboardTab
          onNavigateTab={(tab) => {
            setActiveTab(tab);
          }}
        />
      )}
      {activeTab === "users" && <AdminUsersTab />}
      {activeTab === "meetings" && <AdminMeetingsTab />}
    </AppShell>
  );
}

/* =========================================================
   1. ADMIN DASHBOARD TAB
========================================================= */
function AdminDashboardTab({
  onNavigateTab,
}: {
  onNavigateTab: (tab: "users" | "meetings") => void;
}) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    adminGetStats()
      .then((data) => setStats(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load admin stats"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading system statistics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        <AlertCircle className="size-4 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total users"
          value={String(stats.total_users)}
          note={`${stats.active_users} active · ${stats.admin_users} admin`}
          icon={Users}
        />

        <MetricCard
          label="Total meetings"
          value={String(stats.total_meetings)}
          note="Across all user accounts"
          icon={FileAudio2}
        />

        <MetricCard
          label="Completed meetings"
          value={String(stats.completed_meetings)}
          note="Successfully processed"
          icon={CheckCircle2}
        />

        <MetricCard
          label="Processing / Failed"
          value={`${stats.processing_meetings} / ${stats.failed_meetings}`}
          note={`${stats.processing_meetings} active · ${stats.failed_meetings} failed`}
          icon={Clock3}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Account Governance
              </p>
              <h3 className="mt-1 text-base font-semibold text-foreground">
                User Directory &amp; Access Control
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                Inspect registered accounts, search by name or email, activate or deactivate user
                access, update administrator roles, or remove accounts.
              </p>
            </div>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <Users className="size-5" />
            </span>
          </div>
          <div className="mt-5">
            <Button size="sm" onClick={() => onNavigateTab("users")}>
              Manage Users ({stats.total_users})
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Recording Oversight
              </p>
              <h3 className="mt-1 text-base font-semibold text-foreground">
                Platform Meeting Records
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                Monitor all uploaded recordings across the platform, inspect processing durations
                and failure logs, view transcripts, or delete records.
              </p>
            </div>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <FileAudio2 className="size-5" />
            </span>
          </div>
          <div className="mt-5">
            <Button size="sm" onClick={() => onNavigateTab("meetings")}>
              Manage Meetings ({stats.total_meetings})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   2. ADMIN USER MANAGEMENT TAB
========================================================= */
function AdminUsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState<AdminUserDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; email: string } | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const limit = 20;

  function fetchUsers(queryStr: string, pg: number, roleStr: string, statusStr: string) {
    setLoading(true);
    setError("");
    adminGetUsers(queryStr || undefined, pg, limit, roleStr, statusStr)
      .then((res) => {
        setUsers(res.users ?? []);
        setTotal(res.total ?? 0);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load users"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(q, page, roleFilter, statusFilter);
    }, 200);
    return () => clearTimeout(timer);
  }, [q, page, roleFilter, statusFilter]);

  async function handleInspectUser(userId: string) {
    setLoadingDetails(true);
    try {
      const details = await adminGetUserDetails(userId);
      setSelectedUser(details);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load user details");
    } finally {
      setLoadingDetails(false);
    }
  }

  async function handleRoleChange(userId: string, nextRole: "user" | "admin") {
    try {
      await adminUpdateRole(userId, nextRole);
      toast.success(`User role updated to ${nextRole}.`);
      fetchUsers(q, page, roleFilter, statusFilter);
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({ ...selectedUser, role: nextRole });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    }
  }

  async function handleStatusToggle(userId: string, nextActive: boolean) {
    try {
      await adminUpdateUserStatus(userId, nextActive);
      toast.success(nextActive ? "User account activated." : "User account deactivated.");
      fetchUsers(q, page, roleFilter, statusFilter);
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({ ...selectedUser, is_active: nextActive });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update account status");
    }
  }

  async function confirmDeleteUser() {
    if (!userToDelete) return;
    setDeletingUser(true);
    try {
      await adminDeleteUser(userToDelete.id);
      toast.success("User deleted successfully.");
      if (selectedUser?.id === userToDelete.id) setSelectedUser(null);
      setUserToDelete(null);
      fetchUsers(q, page, roleFilter, statusFilter);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setDeletingUser(false);
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px_160px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search users by name or email..."
            className="pl-9"
          />
        </div>

        <Select
          value={roleFilter}
          onValueChange={(v) => {
            setRoleFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="user">User role</SelectItem>
            <SelectItem value="admin">Admin role</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Deactivated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b bg-primary-soft/30 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Meetings</th>
              <th className="px-4 py-3 font-medium">Registered</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  <Loader2 className="mx-auto mb-2 size-4 animate-spin" />
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No users found matching your criteria.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="transition-colors hover:bg-muted/25">
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-foreground">{user.name || "Unnamed User"}</p>
                    <p className="font-mono text-xs text-muted-foreground">{user.email}</p>
                  </td>

                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                        user.role === "admin"
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>

                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                        user.is_active !== false
                          ? "bg-success-soft text-success"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      <span className="size-1.5 rounded-full bg-current" />
                      {user.is_active !== false ? "Active" : "Deactivated"}
                    </span>
                  </td>

                  <td className="px-4 py-3.5 font-mono text-xs">{user.meeting_count ?? 0}</td>

                  <td className="px-4 py-3.5 text-xs text-muted-foreground">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
                  </td>

                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleInspectUser(user.id)}
                        title="View user details"
                      >
                        <Eye className="size-3.5" />
                        Details
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusToggle(user.id, user.is_active === false)}
                        title={
                          user.is_active === false
                            ? "Activate user account"
                            : "Deactivate user account"
                        }
                      >
                        {user.is_active === false ? (
                          <>
                            <UserCheck className="size-3.5 text-success" />
                            Activate
                          </>
                        ) : (
                          <>
                            <UserX className="size-3.5 text-warning" />
                            Deactivate
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleRoleChange(user.id, user.role === "admin" ? "user" : "admin")
                        }
                      >
                        Make {user.role === "admin" ? "User" : "Admin"}
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setUserToDelete({ id: user.id, email: user.email })}
                        title="Delete user"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {page} of {totalPages} ({total} total users)
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {(selectedUser || loadingDetails) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl sm:max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-border bg-card p-6 shadow-2xl overflow-x-hidden">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">
                  User Account Details
                </h3>
                <p className="text-xs text-muted-foreground">
                  Account metadata and recent uploaded meetings
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedUser(null)}
                aria-label="Close dialog"
                className="rounded-full"
              >
                <X className="size-4" />
              </Button>
            </div>

            {loadingDetails || !selectedUser ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin text-primary" />
                Loading user details...
              </div>
            ) : (
              <div className="mt-4 space-y-5 overflow-y-auto overflow-x-hidden pr-1">
                <div className="grid grid-cols-2 gap-3.5 rounded-xl border border-border/80 bg-muted/20 p-4 text-xs">
                  <div>
                    <p className="text-muted-foreground">Full Name</p>
                    <p className="mt-0.5 font-semibold text-foreground">
                      {selectedUser.name || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email Address</p>
                    <p className="mt-0.5 font-mono text-foreground break-all">
                      {selectedUser.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Role &amp; Status</p>
                    <p className="mt-0.5 font-semibold uppercase text-foreground">
                      {selectedUser.role} · {selectedUser.is_active ? "Active" : "Deactivated"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Meetings</p>
                    <p className="mt-0.5 font-semibold text-foreground">
                      {selectedUser.meeting_count}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="mb-2.5 flex items-center justify-between">
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Recent Meetings ({selectedUser.recent_meetings.length})
                    </p>
                    {selectedUser.recent_meetings.length > 0 && (
                      <span className="text-[11px] text-muted-foreground">
                        Showing latest recordings
                      </span>
                    )}
                  </div>

                  {selectedUser.recent_meetings.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border/80 p-6 text-center text-xs text-muted-foreground">
                      This user has not uploaded any meetings yet.
                    </p>
                  ) : (
                    <div className="max-h-64 divide-y divide-border overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-background/50">
                      {selectedUser.recent_meetings.map((m) => (
                        <div
                          key={m.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 transition-colors hover:bg-muted/30"
                        >
                          <div className="min-w-0 flex-1">
                            <Link
                              to="/meeting/$id"
                              params={{ id: m.id }}
                              onClick={() => setSelectedUser(null)}
                              className="block font-medium text-primary hover:underline break-words whitespace-normal text-sm leading-snug"
                              title={m.filename}
                            >
                              {m.filename}
                            </Link>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock3 className="size-3 text-muted-foreground/70" />
                                {formatDuration(m.duration_seconds)}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <CalendarDays className="size-3 text-muted-foreground/70" />
                                {m.created_at ? new Date(m.created_at).toLocaleDateString() : "—"}
                              </span>
                            </div>
                          </div>
                          <div className="shrink-0 self-start sm:self-center">
                            <StatusBadge status={m.status || "Completed"} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      <ConfirmDeleteDialog
        open={!!userToDelete}
        onOpenChange={(open) => {
          if (!open && !deletingUser) setUserToDelete(null);
        }}
        title="Delete User Account"
        description="Permanently remove this user account, their uploaded meetings, transcripts, and generated summaries. This action is irreversible."
        targetItem={userToDelete?.email}
        deleteLabel="Delete User"
        isDeleting={deletingUser}
        onConfirm={confirmDeleteUser}
      />
    </div>
  );
}

/* =========================================================
   3. ADMIN MEETING MANAGEMENT TAB
========================================================= */
function AdminMeetingsTab() {
  const [meetings, setMeetings] = useState<AdminMeetingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [meetingToDelete, setMeetingToDelete] = useState<{ id: string; filename: string } | null>(
    null,
  );
  const limit = 20;

  function fetchMeetings(queryStr: string, statusStr: string, pg: number) {
    setLoading(true);
    setError("");
    adminGetMeetings(queryStr || undefined, statusStr, pg, limit)
      .then((res) => {
        setMeetings(res.meetings ?? []);
        setTotal(res.total ?? 0);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load meetings"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMeetings(q, statusFilter, page);
    }, 200);
    return () => clearTimeout(timer);
  }, [q, statusFilter, page]);

  async function handleRetry(meetingId: string) {
    setRetryingId(meetingId);
    try {
      await retryMeeting(meetingId, false);
      toast.success("Meeting reprocessed successfully.");
      fetchMeetings(q, statusFilter, page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Retry processing failed.");
      fetchMeetings(q, statusFilter, page);
    } finally {
      setRetryingId(null);
    }
  }

  async function confirmDeleteMeeting() {
    if (!meetingToDelete) return;

    setDeletingId(meetingToDelete.id);
    try {
      await adminDeleteMeeting(meetingToDelete.id);
      toast.success("Meeting deleted successfully.");
      setMeetingToDelete(null);
      fetchMeetings(q, statusFilter, page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete meeting");
    } finally {
      setDeletingId(null);
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search meetings by filename..."
            className="pl-9"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="processed">Completed</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b bg-primary-soft/30 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Recording</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Duration / Time</th>
              <th className="px-4 py-3 font-medium">Outcomes</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Uploaded</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  <Loader2 className="mx-auto mb-2 size-4 animate-spin" />
                  Loading platform meetings...
                </td>
              </tr>
            ) : meetings.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No meetings match the selected criteria.
                </td>
              </tr>
            ) : (
              meetings.map((m) => (
                <tr key={m.id} className="transition-colors hover:bg-muted/25">
                  <td className="px-4 py-3.5">
                    <Link
                      to="/meeting/$id"
                      params={{ id: m.id }}
                      className="font-semibold text-foreground hover:text-primary hover:underline"
                    >
                      {m.filename}
                    </Link>
                    {m.error_message && (
                      <p
                        className="mt-1 max-w-xs truncate text-xs text-destructive"
                        title={m.error_message}
                      >
                        Error: {m.error_message}
                      </p>
                    )}
                    {m.status === "processing" && m.processing_stage && (
                      <p className="mt-1 text-xs text-info">{m.processing_stage}</p>
                    )}
                  </td>

                  <td className="px-4 py-3.5">
                    <p className="text-xs font-medium text-foreground">{m.owner_name}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{m.owner_email}</p>
                  </td>

                  <td className="px-4 py-3.5 text-xs text-muted-foreground">
                    <p>{formatDuration(m.duration_seconds)}</p>
                    {m.processing_time_seconds > 0 && (
                      <p className="text-[11px]">{m.processing_time_seconds}s proc</p>
                    )}
                  </td>

                  <td className="px-4 py-3.5 text-xs text-muted-foreground">
                    {m.decision_count} decisions · {m.action_item_count} tasks
                  </td>

                  <td className="px-4 py-3.5">
                    <StatusBadge status={m.status || "Processed"} />
                  </td>

                  <td className="px-4 py-3.5 text-xs text-muted-foreground">
                    {m.created_at ? new Date(m.created_at).toLocaleDateString() : "—"}
                  </td>

                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      {m.status === "failed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={retryingId === m.id}
                          onClick={() => handleRetry(m.id)}
                          title="Retry processing in-place"
                        >
                          {retryingId === m.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="size-3.5" />
                          )}
                          Retry
                        </Button>
                      )}
                      <Button asChild size="sm" variant="outline">
                        <Link to="/meeting/$id" params={{ id: m.id }}>
                          Inspect
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={deletingId === m.id}
                        onClick={() => setMeetingToDelete({ id: m.id, filename: m.filename })}
                        title="Delete meeting"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {page} of {totalPages} ({total} total meetings)
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Meeting Confirmation Modal */}
      <ConfirmDeleteDialog
        open={!!meetingToDelete}
        onOpenChange={(open) => {
          if (!open && !deletingId) setMeetingToDelete(null);
        }}
        title="Delete Meeting"
        description="Permanently delete this meeting recording, Whisper transcription, and AI summary. This action cannot be undone."
        targetItem={meetingToDelete?.filename}
        deleteLabel="Delete Meeting"
        isDeleting={!!deletingId}
        onConfirm={confirmDeleteMeeting}
      />
    </div>
  );
}
