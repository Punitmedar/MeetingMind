import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CheckSquare2,
  Clock3,
  Copy,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileAudio2,
  FileText,
  Headphones,
  Lightbulb,
  ListChecks,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ActionsBarChart, MeetingsAreaChart } from "@/components/analytics-chart";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type ActionItem,
  type AnalyticsResponse,
  type DashboardStats,
  type MeetingItem,
  type TranscriptSegment,
  changePassword,
  deleteMeeting,
  getActionItems,
  getAnalytics,
  getAudioUrl,
  getDashboardStats,
  getMe,
  getMeeting,
  getMeetings,
  retryMeeting,
  updateActionItemStatus,
  updateMeeting,
  updateProfile,
  uploadMeetingWithProgress,
} from "@/lib/api";
import { setTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <section
    className={cn(
      "rounded-2xl border border-border/85 bg-card shadow-card transition-all",
      className,
    )}
  >
    {children}
  </section>
);

const CardHead = ({ title, note }: { title: string; note?: string }) => (
  <div className="border-b border-border/80 bg-primary-soft/25 px-5 py-4">
    <h2 className="text-base font-semibold text-foreground">{title}</h2>
    {note && <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>}
  </div>
);

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins === 0) return `${secs}s`;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins} min`;
}

function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-56 place-items-center p-8 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
          <FileAudio2 className="size-5" />
        </span>
        <h2 className="mt-4 font-display text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{text}</p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}

/* =========================================================
   1. USER DASHBOARD PAGE (REFERENCE 1 DESIGN)
========================================================= */
export function DashboardPage() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const [userName, setUserName] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("meetiq_name") || "" : "",
  );
  const [stats, setStats] = useState<DashboardStats>({
    total_meetings: 0,
    processed_meetings: 0,
    processing_meetings: 0,
    failed_meetings: 0,
    average_duration_seconds: 0,
    action_items: 0,
    completed_action_items: 0,
    pending_action_items: 0,
    completion_rate: 0,
    recent_summaries: [],
  });
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [tasks, setTasks] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([getDashboardStats(), getAnalytics(), getActionItems()])
      .then(([statsData, analyticsData, actionItemsData]) => {
        if (!active) return;
        setStats(statsData);
        setAnalytics(analyticsData);
        setTasks(actionItemsData.action_items || []);
        const storedName = localStorage.getItem("meetiq_name") || "";
        if (storedName) setUserName(storedName);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const recentSummaries = stats.recent_summaries ?? [];
  const upcomingTasks = tasks.filter((t) => t.status !== "Completed").slice(0, 4);
  const displayTasks = upcomingTasks.length > 0 ? upcomingTasks : tasks.slice(0, 4);

  return (
    <AppShell>
      {/* 1. WELCOME SECTION */}
      <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-[#E3DEFA] bg-gradient-to-r from-[#F3F0FF] via-[#F9F8FF] to-white p-5 shadow-card sm:flex-row sm:items-center sm:p-6 dark:border-border dark:from-[#231E42] dark:via-card dark:to-card">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-medium text-primary shadow-2xs dark:bg-white/10">
            Workspace Overview
          </span>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-[26px]">
            {greeting}
            {userName ? `, ${userName}` : ""}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Track your meeting recordings, transcripts, confirmed decisions, and pending follow-up
            tasks in one place.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          <Button asChild variant="outline" size="default">
            <Link to="/meetings">All Meetings</Link>
          </Button>
          <Button asChild size="default">
            <Link to="/upload">
              <Upload className="size-4" />
              Upload Meeting
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2.5 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2, 3, 4. METRIC CARDS: TOTAL MEETINGS, COMPLETED RECORDINGS, PENDING ACTION ITEMS, AVERAGE DURATION */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total meetings"
          value={loading ? "…" : String(stats.total_meetings)}
          note={
            stats.processing_meetings
              ? `${stats.processing_meetings} currently processing`
              : "Recordings in your workspace"
          }
          icon={FileAudio2}
          className="stagger-1"
        />

        <MetricCard
          label="Completed recordings"
          value={loading ? "…" : String(stats.processed_meetings)}
          note={
            stats.failed_meetings
              ? `${stats.failed_meetings} failed processing`
              : "Transcribed & summarized"
          }
          icon={CheckCircle2}
          className="stagger-2"
        />

        <MetricCard
          label="Pending action items"
          value={loading ? "…" : String(stats.pending_action_items)}
          note={`${stats.completed_action_items} completed · ${stats.action_items} total tasks`}
          icon={CheckSquare2}
          className="stagger-3"
        />

        <MetricCard
          label="Average duration"
          value={loading ? "…" : formatDuration(stats.average_duration_seconds)}
          note={
            stats.average_duration_seconds > 0
              ? "Across completed recordings"
              : "Upload a recording to measure"
          }
          icon={Clock3}
          className="stagger-4"
        />
      </div>

      {/* 6 & 7. MEETING ACTIVITY & UPCOMING TASKS AND DEADLINES */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,1fr)]">
        {/* 6. MEETING ACTIVITY */}
        <Card>
          <CardHead
            title="Meeting Activity"
            note="Monthly recording volume and action-item completion progress"
          />
          <div className="p-5">
            <MeetingsAreaChart analyticsData={analytics} loading={loading} />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/80 bg-primary-soft/20 px-4 py-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Action Item Completion Rate
                </p>
                <p className="mt-0.5 text-lg font-semibold text-foreground">
                  {loading ? "…" : `${stats.completion_rate}%`}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({stats.completed_action_items} of {stats.action_items} completed)
                  </span>
                </p>
              </div>
              <div className="w-full max-w-[200px]">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${Math.min(100, stats.completion_rate)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 7. UPCOMING TASKS AND DEADLINES */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between border-b border-border/80 bg-primary-soft/25 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Upcoming Tasks &amp; Deadlines
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Assigned action items extracted from your meetings
              </p>
            </div>
            <Link
              to="/action-items"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              View all
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="flex-1 p-5">
            {loading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading tasks...
              </div>
            ) : displayTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
                <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
                  <ListChecks className="size-5" />
                </span>
                <p className="mt-3 text-sm font-semibold text-foreground">
                  No pending action items
                </p>
                <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
                  Action items and deadlines extracted from your meeting transcripts will appear
                  here automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayTasks.map((task) => (
                  <Link
                    key={task.id}
                    to="/meeting/$id"
                    params={{ id: task.meeting_id }}
                    className="block rounded-xl border border-border/80 bg-background/60 p-3.5 transition-colors hover:border-primary/30 hover:bg-primary-soft/20"
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <p className="line-clamp-2 text-xs font-medium leading-5 text-foreground">
                        {task.task}
                      </p>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                          task.status === "Completed"
                            ? "bg-success-soft text-success"
                            : "bg-primary-soft text-primary",
                        )}
                      >
                        {task.status}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="truncate font-medium text-foreground/80">
                        {task.meeting}
                      </span>
                      <span>·</span>
                      <span>Due: {task.deadline || "As scheduled"}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 5 & 8. RECENT MEETINGS AND RECENT SUMMARIES / MEETING INSIGHTS */}
      <div className="mt-6 grid gap-6 xl:grid-cols-12">
        {/* 5. RECENT MEETINGS */}
        <Card className="xl:col-span-6">
          <div className="flex items-center justify-between border-b border-border/80 bg-primary-soft/25 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Recent Meetings</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Latest uploaded audio and video recordings
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/meetings">View All</Link>
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading recent meetings...
            </div>
          ) : recentSummaries.length === 0 ? (
            <EmptyState
              title="No meetings in your workspace yet"
              text="Upload an audio or video recording to generate a transcript, executive summary, and Minutes of Meeting."
              action={
                <Button asChild size="sm">
                  <Link to="/upload">
                    <Upload className="size-4" />
                    Upload First Meeting
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-border/80">
              {recentSummaries.map((item) => (
                <Link
                  key={item.id}
                  to="/meeting/$id"
                  params={{ id: item.id }}
                  className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-primary-soft/20"
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                      <FileAudio2 className="size-5" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {item.filename}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          {item.created_at
                            ? new Date(item.created_at).toLocaleDateString()
                            : "Recently uploaded"}
                        </span>
                        {item.duration_seconds ? (
                          <span>· {formatDuration(item.duration_seconds)}</span>
                        ) : null}
                        {item.decision_count !== undefined && (
                          <span>
                            · {item.decision_count} decision{item.decision_count !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <StatusBadge status={item.status || "Processed"} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* 8. RECENT SUMMARIES OR MEETING INSIGHTS */}
        <Card className="xl:col-span-6">
          <div className="flex items-center justify-between border-b border-border/80 bg-primary-soft/25 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Recent Summaries &amp; Meeting Insights
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Executive takeaways from your processed conversations
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-medium text-primary">
              <Sparkles className="size-3" />
              Insights
            </span>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading meeting insights...
            </div>
          ) : recentSummaries.length === 0 ? (
            <EmptyState
              title="No meeting insights available yet"
              text="Once a recording finishes processing, its executive summary and key outcomes will appear here."
            />
          ) : (
            <div className="divide-y divide-border/80">
              {recentSummaries.map((item) => (
                <Link
                  key={`insight-${item.id}`}
                  to="/meeting/$id"
                  params={{ id: item.id }}
                  className="block px-5 py-4 transition-colors hover:bg-primary-soft/20"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-primary">{item.filename}</p>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {item.action_item_count ?? 0} task
                      {(item.action_item_count ?? 0) !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-foreground/90">
                    {item.summary ||
                      item.processing_stage ||
                      "Summary will appear once processing completes."}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

/* =========================================================
   2. MEETINGS LIST PAGE
========================================================= */
export function MeetingsPage() {
  const savedSearch =
    typeof window !== "undefined" ? (sessionStorage.getItem("meetiq_search") ?? "") : "";
  const [query, setQuery] = useState(savedSearch);
  const [statusFilter, setStatusFilter] = useState("All");
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [meetingToDelete, setMeetingToDelete] = useState<{ id: string; filename: string } | null>(
    null,
  );
  const limit = 20;

  async function fetchMeetingsList(searchStr: string, statusStr: string, pageNum: number) {
    setLoading(true);
    try {
      const data = await getMeetings(pageNum, limit, searchStr, statusStr);
      setMeetings(data.meetings || []);
      setTotal(data.total || 0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load meetings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMeetingsList(query, statusFilter, page);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, statusFilter, page]);

  async function confirmDeleteMeeting() {
    if (!meetingToDelete) return;

    setDeletingId(meetingToDelete.id);
    try {
      await deleteMeeting(meetingToDelete.id);
      toast.success("Meeting deleted successfully.");
      setMeetingToDelete(null);
      fetchMeetingsList(query, statusFilter, page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete meeting");
    } finally {
      setDeletingId(null);
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Meeting Library"
        title="Meetings"
        description="Search, filter, and inspect your recorded meetings, transcripts, and extracted decisions."
        action={
          <Button asChild>
            <Link to="/upload">
              <Upload className="size-4" />
              Upload Meeting
            </Link>
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by filename, summary, or transcript keyword..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All statuses</SelectItem>
            <SelectItem value="Processed">Completed</SelectItem>
            <SelectItem value="Processing">Processing</SelectItem>
            <SelectItem value="Failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading meetings...
          </div>
        ) : meetings.length === 0 ? (
          <EmptyState
            title="No matching meetings found"
            text={
              query || statusFilter !== "All"
                ? "Try clearing your search query or changing the status filter."
                : "Upload a meeting recording to generate your first transcript and summary."
            }
            action={
              !query && statusFilter === "All" ? (
                <Button asChild size="sm">
                  <Link to="/upload">
                    <Upload className="size-4" />
                    Upload Meeting
                  </Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {meetings.map((m) => {
              const created = m.created_at ? new Date(m.created_at) : null;
              const dateStr = created ? created.toLocaleDateString() : "Unknown date";
              const timeStr = created
                ? created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "";

              return (
                <div
                  key={m.id}
                  className="flex flex-col justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center"
                >
                  <Link
                    to="/meeting/$id"
                    params={{ id: m.id }}
                    className="flex min-w-0 flex-1 items-start gap-3.5"
                  >
                    <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                      <FileAudio2 className="size-5" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{m.filename}</p>

                      {m.status === "failed" && m.error_message ? (
                        <p className="mt-1 line-clamp-1 text-xs text-destructive">
                          Error: {m.error_message}
                        </p>
                      ) : m.summary_preview ? (
                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                          {m.summary_preview}
                        </p>
                      ) : null}

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="size-3.5" />
                          {dateStr}
                          {timeStr ? ` · ${timeStr}` : ""}
                        </span>

                        <span className="flex items-center gap-1">
                          <Clock3 className="size-3.5" />
                          {formatDuration(m.duration_seconds)}
                        </span>

                        {m.decision_count !== undefined && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="size-3.5" />
                            {m.decision_count} decision{m.decision_count !== 1 ? "s" : ""}
                          </span>
                        )}

                        {m.action_item_count !== undefined && (
                          <span className="flex items-center gap-1">
                            <ListChecks className="size-3.5" />
                            {m.action_item_count} action item{m.action_item_count !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>

                  <div className="flex items-center justify-end gap-2.5 shrink-0">
                    <StatusBadge status={m.status || "Processed"} />

                    <Button asChild variant="outline" size="sm">
                      <Link to="/meeting/$id" params={{ id: m.id }}>
                        Open
                      </Link>
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      disabled={deletingId === m.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMeetingToDelete({ id: m.id, filename: m.filename });
                      }}
                      aria-label={`Delete ${m.filename}`}
                      title="Delete meeting"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing page {page} of {totalPages} ({total} total meetings)
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

      {/* Delete Meeting Confirmation Dialog */}
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
    </AppShell>
  );
}

/* =========================================================
   3. UPLOAD & LIVE PROCESSING PAGE
========================================================= */
export function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [processingStage, setProcessingStage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [dragging, setDragging] = useState(false);
  const pollTimerRef = useRef<number | null>(null);

  const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB
  const ACCEPTED_EXTENSIONS = [
    ".mp3",
    ".wav",
    ".m4a",
    ".aac",
    ".ogg",
    ".flac",
    ".mp4",
    ".mov",
    ".avi",
    ".mkv",
    ".webm",
  ];
  const ACCEPT = ACCEPTED_EXTENSIONS.join(",");

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  function selectFile(selectedFile: File | null) {
    setErrorMessage("");
    if (!selectedFile) return;

    const dotIndex = selectedFile.name.lastIndexOf(".");
    const extension = dotIndex >= 0 ? selectedFile.name.slice(dotIndex).toLowerCase() : "";

    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setFile(null);
      setErrorMessage(
        `Unsupported file format (${extension || "unknown"}). Supported formats: ${ACCEPTED_EXTENSIONS.join(", ")}`,
      );
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setErrorMessage("File exceeds the 500 MB maximum size limit.");
      return;
    }

    if (selectedFile.size === 0) {
      setFile(null);
      setErrorMessage("The selected file is empty (0 bytes). Please choose a valid recording.");
      return;
    }

    setFile(selectedFile);
  }

  function formatSize(bytes: number) {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleUpload() {
    if (!file || uploading) return;

    setUploading(true);
    setUploadPercent(0);
    setProcessingStage("Uploading recording to server...");
    setErrorMessage("");

    try {
      const result = await uploadMeetingWithProgress(
        file,
        (pct) => {
          setUploadPercent(pct);
          if (pct >= 100) {
            setProcessingStage("Initializing AI pipeline...");
          }
        },
        true,
      );

      const meetingId = result.meeting_id;
      if (result.status === "processed") {
        toast.success("Meeting processed successfully!");
        navigate({ to: "/meeting/$id", params: { id: meetingId } });
        return;
      }

      setProcessingStage(result.processing_stage || "Extracting audio with FFmpeg...");

      // Poll meeting status with bounded attempts and concurrent-request protection
      await new Promise<void>((resolve, reject) => {
        let inFlight = false;
        let attempts = 0;
        const MAX_ATTEMPTS = 150; // ~3 minutes total

        pollTimerRef.current = window.setInterval(async () => {
          if (inFlight) return;
          inFlight = true;
          attempts += 1;

          if (attempts > MAX_ATTEMPTS) {
            if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
            reject(
              new Error(
                "Processing timed out. Please check your meetings dashboard for the latest status.",
              ),
            );
            return;
          }

          try {
            const current = await getMeeting(meetingId);
            if (current.processing_stage) {
              setProcessingStage(current.processing_stage);
            }
            if (current.status === "processed" || current.status === "completed") {
              if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
              toast.success("Meeting processed successfully!");
              navigate({ to: "/meeting/$id", params: { id: meetingId } });
              resolve();
            } else if (current.status === "failed") {
              if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
              reject(new Error(current.error_message || "AI pipeline processing failed."));
            }
          } catch (pollErr) {
            if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
            reject(pollErr);
          } finally {
            inFlight = false;
          }
        }, 1200);
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Upload or processing failed. Verify your backend connection and try again.",
      );
      setUploading(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Upload Recording"
        title="Upload a Meeting Recording"
        description="Add an audio or video recording to generate a searchable transcript, clear summary, decisions, and action items."
      />

      <div className="mx-auto w-full max-w-3xl space-y-6">
        <Card className="overflow-hidden rounded-xl border">
          <div className="p-5 sm:p-8">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                if (!uploading) setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                if (!uploading) {
                  selectFile(event.dataTransfer.files?.[0] ?? null);
                }
              }}
              className={cn(
                "rounded-xl border-2 border-dashed p-6 text-center transition-colors sm:p-10",
                dragging
                  ? "border-primary bg-primary-soft/50"
                  : "border-border bg-muted/20 hover:border-primary/50",
                uploading && "pointer-events-none opacity-60",
              )}
            >
              <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary-soft">
                <FileAudio2 className="size-6 text-primary" />
              </div>

              <h2 className="mt-4 text-base font-semibold text-foreground">
                Drag and drop your meeting recording here
              </h2>
              <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-muted-foreground">
                Supports audio and video files up to 500 MB ({ACCEPTED_EXTENSIONS.join(", ")}).
              </p>

              <label className="mt-5 inline-flex cursor-pointer items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-xs font-medium text-primary-foreground shadow-xs transition hover:bg-[#5146D8]">
                Choose File
                <input
                  type="file"
                  accept={ACCEPT}
                  className="sr-only"
                  disabled={uploading}
                  onChange={(event) => {
                    selectFile(event.target.files?.[0] ?? null);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>

            {file && (
              <div className="mt-5 flex items-center gap-3 rounded-xl border bg-muted/20 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
                  <FileAudio2 className="size-5 text-primary" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{file.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatSize(file.size)} · Ready to process
                  </p>
                </div>

                {!uploading && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFile(null);
                      setErrorMessage("");
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
            )}

            {/* Real-time Upload & Processing Progress */}
            {uploading && (
              <div
                className="mt-5 rounded-xl border border-primary/30 bg-primary-soft/40 p-5"
                role="status"
                aria-live="polite"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <Loader2 className="size-4 animate-spin text-primary" />
                    <p className="text-sm font-semibold text-foreground">{processingStage}</p>
                  </div>
                  <span className="text-xs font-semibold text-primary">
                    {uploadPercent < 100 ? `${uploadPercent}% uploaded` : "Processing"}
                  </span>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full bg-primary transition-all duration-300",
                      uploadPercent >= 100 && "animate-pulse",
                    )}
                    style={{ width: `${Math.max(10, uploadPercent)}%` }}
                  />
                </div>

                {(() => {
                  const stageLower = processingStage.toLowerCase();
                  const isStage2 =
                    stageLower.includes("transcri") || stageLower.includes("whisper");
                  const isStage3 =
                    stageLower.includes("flan") ||
                    stageLower.includes("summary") ||
                    stageLower.includes("completed");

                  const stage1Done = isStage2 || isStage3;
                  const stage1Active =
                    !stage1Done &&
                    (stageLower.includes("audio") ||
                      stageLower.includes("ffmpeg") ||
                      uploadPercent === 100);

                  const stage2Done = isStage3;
                  const stage2Active = !stage2Done && isStage2;

                  const stage3Done = stageLower.includes("completed");
                  const stage3Active =
                    !stage3Done && (stageLower.includes("flan") || stageLower.includes("summary"));

                  return (
                    <div className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                      <div
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2 transition-all duration-300",
                          stage1Done
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium"
                            : stage1Active
                              ? "border-primary bg-primary-soft text-primary font-semibold shadow-xs"
                              : "border-border bg-card/60 text-muted-foreground",
                        )}
                      >
                        {stage1Done ? (
                          <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        ) : stage1Active ? (
                          <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />
                        ) : (
                          <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                        )}
                        <span>1. Audio extraction</span>
                      </div>

                      <div
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2 transition-all duration-300",
                          stage2Done
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium"
                            : stage2Active
                              ? "border-primary bg-primary-soft text-primary font-semibold shadow-xs"
                              : "border-border bg-card/60 text-muted-foreground",
                        )}
                      >
                        {stage2Done ? (
                          <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        ) : stage2Active ? (
                          <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />
                        ) : (
                          <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                        )}
                        <span>2. Whisper transcription</span>
                      </div>

                      <div
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2 transition-all duration-300",
                          stage3Done
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium"
                            : stage3Active
                              ? "border-primary bg-primary-soft text-primary font-semibold shadow-xs"
                              : "border-border bg-card/60 text-muted-foreground",
                        )}
                      >
                        {stage3Done ? (
                          <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        ) : stage3Active ? (
                          <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />
                        ) : (
                          <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                        )}
                        <span>3. FLAN-T5 summary</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {errorMessage && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p className="font-semibold">Processing Error</p>
                  <p className="mt-0.5 leading-5">{errorMessage}</p>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Your recording will be transcribed and summarized automatically.
              </p>

              <Button
                size="lg"
                className="w-full sm:w-auto"
                onClick={handleUpload}
                disabled={!file || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Processing Recording...
                  </>
                ) : (
                  <>
                    <Upload className="size-4" />
                    Upload &amp; Process
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

/* =========================================================
   4. PROCESSING STATUS PAGE
========================================================= */
export function ProcessingPage() {
  const [recentMeetings, setRecentMeetings] = useState<MeetingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMeetings(1, 8)
      .then((res) => setRecentMeetings(res.meetings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pipelineStages = [
    {
      title: "1. Media Upload & Audio Preparation",
      desc: "Extracts the spoken audio stream from uploaded video or audio files for clear transcription.",
    },
    {
      title: "2. Time-Stamped Speech Transcription",
      desc: "Transcribes spoken conversation into searchable segments with timestamps.",
    },
    {
      title: "3. Executive Summary Generation",
      desc: "Condenses the full discussion into a concise, accurate summary of key takeaways.",
    },
    {
      title: "4. Structured Meeting Minutes & Action Items",
      desc: "Organizes discussion points, confirmed decisions, assigned tasks, and target deadlines.",
    },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Processing Status"
        title="Meeting Processing & Recent Jobs"
        description="Review how recordings are processed and monitor the status of your recent uploads."
        action={
          <Button asChild>
            <Link to="/upload">
              <Upload className="size-4" />
              Upload Recording
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card className="overflow-hidden">
          <CardHead
            title="Processing Workflow"
            note="Automated stages from recording upload to structured notes"
          />
          <div className="p-6">
            <div className="space-y-0">
              {pipelineStages.map((stage, i) => (
                <div key={stage.title} className="grid grid-cols-[32px_minmax(0,1fr)] gap-4">
                  <div className="flex flex-col items-center">
                    <span className="grid size-7 place-items-center rounded-full border border-primary/30 bg-primary-soft text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    {i < pipelineStages.length - 1 && <span className="h-12 w-px bg-border" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-semibold text-foreground">{stage.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{stage.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHead
            title="Recent Uploads"
            note="Processing status and duration of your latest recordings"
          />
          <div className="divide-y divide-border">
            {loading ? (
              <div className="p-5 text-xs text-muted-foreground">Loading recent jobs...</div>
            ) : recentMeetings.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No recordings uploaded yet.
              </div>
            ) : (
              recentMeetings.map((m) => (
                <Link
                  key={m.id}
                  to="/meeting/$id"
                  params={{ id: m.id }}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-muted/20"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{m.filename}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {m.processing_stage || "Completed"}
                      {m.processing_time_seconds ? ` · ${m.processing_time_seconds}s` : ""}
                    </p>
                  </div>
                  <StatusBadge status={m.status || "Processed"} />
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

/* =========================================================
   5. ACTION ITEMS PAGE
========================================================= */
export function ActionItemsPage() {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  function loadItems() {
    setLoading(true);
    getActionItems()
      .then((data) => {
        setItems(data.action_items || []);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load action items");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function handleToggleStatus(item: ActionItem) {
    const nextStatus: "Pending" | "Completed" =
      item.status === "Completed" ? "Pending" : "Completed";

    setUpdatingTaskId(item.id);
    try {
      await updateActionItemStatus(item.meeting_id, item.task, nextStatus);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: nextStatus } : i)));
      toast.success(`Task marked as ${nextStatus.toLowerCase()}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update task status");
    } finally {
      setUpdatingTaskId(null);
    }
  }

  const filteredItems = items.filter((item) => {
    const matchesStatus = filter === "All" || item.status === filter;
    const matchesSearch =
      !search.trim() ||
      item.task.toLowerCase().includes(search.toLowerCase()) ||
      item.meeting.toLowerCase().includes(search.toLowerCase()) ||
      item.owner.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <AppShell>
      <PageHeader
        eyebrow="Follow-Through"
        title="Action Items"
        description="Track assigned tasks, deadlines, and completion status extracted from your meetings."
      />

      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          {["All", "Pending", "Completed"].map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter tasks or meetings..."
              className="h-9 pl-8 text-xs"
            />
          </div>
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            {filteredItems.length} task{filteredItems.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
            <tr>
              {["Task & Source Meeting", "Owner", "Deadline", "Status", "Priority", "Action"].map(
                (h) => (
                  <th className="px-5 py-3.5 font-medium" key={h}>
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  <Loader2 className="mx-auto mb-2 size-4 animate-spin" />
                  Loading action items...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No action items match the current filter.
                </td>
              </tr>
            ) : (
              filteredItems.map((i) => (
                <tr className="transition-colors hover:bg-muted/20" key={i.id}>
                  <td className="px-5 py-4">
                    <p
                      className={cn(
                        "font-medium text-foreground",
                        i.status === "Completed" && "line-through text-muted-foreground",
                      )}
                    >
                      {i.task}
                    </p>
                    <Link
                      to="/meeting/$id"
                      params={{ id: i.meeting_id }}
                      className="mt-1 inline-block text-xs text-primary hover:underline"
                    >
                      {i.meeting}
                    </Link>
                  </td>

                  <td className="px-5 py-4 text-xs font-medium">{i.owner}</td>

                  <td className="px-5 py-4 text-xs text-muted-foreground">{i.deadline}</td>

                  <td className="px-5 py-4">
                    <StatusBadge status={i.status} />
                  </td>

                  <td className="px-5 py-4 text-xs">
                    <span
                      className={cn(
                        "font-semibold",
                        i.priority === "High"
                          ? "text-destructive"
                          : i.priority === "Medium"
                            ? "text-warning"
                            : "text-muted-foreground",
                      )}
                    >
                      {i.priority}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <Button
                      size="sm"
                      variant={i.status === "Completed" ? "outline" : "default"}
                      disabled={updatingTaskId === i.id}
                      onClick={() => handleToggleStatus(i)}
                      className="text-xs"
                    >
                      {i.status === "Completed" ? "Mark Pending" : "Mark Done"}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </AppShell>
  );
}

/* =========================================================
   6. ANALYTICS PAGE
========================================================= */
export function AnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats>({
    total_meetings: 0,
    processed_meetings: 0,
    average_duration_seconds: 0,
    action_items: 0,
    completed_action_items: 0,
    pending_action_items: 0,
    completion_rate: 0,
  });
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([getDashboardStats(), getAnalytics()])
      .then(([statsData, analyticsData]) => {
        if (!active) return;
        setStats(statsData);
        setAnalytics(analyticsData);
      })
      .catch((error) => {
        console.error("Failed to load analytics:", error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Workspace Intelligence"
        title="Analytics"
        description="Quantitative insights across your processed meetings, durations, and action-item completion."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total meetings"
          value={loading ? "…" : String(stats.total_meetings)}
          note={`${stats.processed_meetings} completed`}
          icon={FileAudio2}
        />

        <MetricCard
          label="Average duration"
          value={loading ? "…" : formatDuration(stats.average_duration_seconds)}
          note={
            stats.average_duration_seconds > 0
              ? "Across processed recordings"
              : "No duration data yet"
          }
          icon={Clock3}
        />

        <MetricCard
          label="Action items"
          value={loading ? "…" : String(stats.action_items)}
          note={`${stats.pending_action_items} pending`}
          icon={ListChecks}
        />

        <MetricCard
          label="Completion rate"
          value={loading ? "…" : `${stats.completion_rate}%`}
          note={`${stats.completed_action_items} completed`}
          icon={CheckCircle2}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHead title="Meetings Over Time" note="Monthly processed meeting volume" />
          <div className="p-4">
            <MeetingsAreaChart analyticsData={analytics} loading={loading} />
          </div>
        </Card>

        <Card>
          <CardHead title="Action Items Extracted" note="Monthly action items identified in MoM" />
          <div className="p-4">
            <ActionsBarChart analyticsData={analytics} loading={loading} />
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

/* =========================================================
   7. SETTINGS PAGE
========================================================= */
export function SettingsPage() {
  const [activeSection, setActiveSection] = useState<"profile" | "appearance">("profile");
  const [dark, setDark] = useState(() =>
    typeof window !== "undefined" ? document.documentElement.classList.contains("dark") : false,
  );
  const [name, setName] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem("meetiq_name") ?? "") : "",
  );
  const [email, setEmail] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem("meetiq_email") ?? "") : "",
  );
  const [userRole, setUserRole] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem("meetiq_role") ?? "user") : "user",
  );
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  useEffect(() => {
    getMe()
      .then((user) => {
        if (user.name !== undefined) setName(user.name);
        if (user.email) setEmail(user.email);
        if (user.role) setUserRole(user.role);
      })
      .catch(() => {});
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error("Name must be at least 2 characters.");
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile(trimmed);
      toast.success("Profile updated successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd.length < 8 || !/[A-Za-z]/.test(newPwd) || !/\d/.test(newPwd)) {
      toast.error("New password must be at least 8 characters and include a letter and a number.");
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error("Passwords do not match.");
      return;
    }
    setChangingPwd(true);
    try {
      await changePassword(currentPwd, newPwd);
      toast.success("Password updated successfully.");
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setChangingPwd(false);
    }
  }

  const navItems: Array<{ id: "profile" | "appearance"; label: string }> = [
    { id: "profile", label: "Account & Security" },
    { id: "appearance", label: "Appearance" },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Account Preferences"
        title="Settings"
        description="Manage your account profile, password security, and workspace theme."
      />

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              className={cn(
                "w-full rounded-lg px-3.5 py-2.5 text-left text-sm transition-colors",
                activeSection === item.id
                  ? "bg-primary-soft font-semibold text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="space-y-6">
          {activeSection === "profile" && (
            <>
              <Card>
                <CardHead title="Profile Information" note="Update your display name" />
                <form onSubmit={handleSaveProfile} className="grid gap-5 p-5 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    Full Name
                    <Input
                      className="mt-2"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      required
                    />
                  </label>

                  <label className="text-sm font-medium">
                    Email Address
                    <Input className="mt-2" value={email} readOnly disabled />
                  </label>

                  <label className="text-sm font-medium sm:col-span-2">
                    Account Role
                    <Input className="mt-2" value={userRole.toUpperCase()} readOnly disabled />
                  </label>

                  <div className="sm:col-span-2">
                    <Button type="submit" disabled={savingProfile}>
                      {savingProfile ? "Saving..." : "Save Profile"}
                    </Button>
                  </div>
                </form>
              </Card>

              <Card>
                <CardHead
                  title="Change Password"
                  note="Must be at least 8 characters with at least one letter and one number"
                />
                <form onSubmit={handleChangePassword} className="grid gap-4 p-5">
                  <div className=" flex items-center justify-between">
                    <label htmlFor="cur-pwd" className="text-sm font-medium">
                      Current Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {showPwd ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      {showPwd ? "Hide passwords" : "Show passwords"}
                    </button>
                  </div>
                  <Input
                    id="cur-pwd"
                    type={showPwd ? "text" : "password"}
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    autoComplete="current-password"
                    required
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium">
                      New Password
                      <Input
                        type={showPwd ? "text" : "password"}
                        className="mt-2"
                        value={newPwd}
                        onChange={(e) => setNewPwd(e.target.value)}
                        autoComplete="new-password"
                        required
                      />
                    </label>

                    <label className="text-sm font-medium">
                      Confirm New Password
                      <Input
                        type={showPwd ? "text" : "password"}
                        className="mt-2"
                        value={confirmPwd}
                        onChange={(e) => setConfirmPwd(e.target.value)}
                        autoComplete="new-password"
                        required
                      />
                    </label>
                  </div>

                  <div>
                    <Button
                      type="submit"
                      variant="outline"
                      disabled={changingPwd || !currentPwd || !newPwd || !confirmPwd}
                    >
                      {changingPwd ? "Updating..." : "Update Password"}
                    </Button>
                  </div>
                </form>
              </Card>
            </>
          )}

          {activeSection === "appearance" && (
            <Card>
              <CardHead title="Appearance" note="Customize your workspace color theme" />
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-5">
                <div>
                  <p className="text-sm font-medium">Dark Mode</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Switch between light (default) and dark workspace themes.
                  </p>
                </div>

                <Switch
                  checked={dark}
                  onCheckedChange={(v) => {
                    setDark(v);
                    setTheme(v ? "dark" : "light");
                  }}
                />
              </div>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}

/* =========================================================
   8. MEETING DETAILS / WORKSPACE PAGE
========================================================= */
export function MeetingWorkspacePage({ id }: { id: string }) {
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<MeetingItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editFilename, setEditFilename] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const overviewAudioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let active = true;
    let pollTimer: number | null = null;

    async function loadMeeting() {
      try {
        const data = await getMeeting(id);
        if (!active) return;
        setMeeting(data);
        setEditFilename(data.filename || "");
        setEditSummary(data.summary || "");
        if (data.action_item_status_map) {
          setStatusMap(data.action_item_status_map);
        }

        if (data.status === "processing") {
          let inFlight = false;
          let attempts = 0;
          const MAX_ATTEMPTS = 150;

          pollTimer = window.setInterval(async () => {
            if (inFlight) return;
            inFlight = true;
            attempts += 1;

            if (attempts > MAX_ATTEMPTS) {
              if (pollTimer) window.clearInterval(pollTimer);
              return;
            }

            try {
              const updated = await getMeeting(id);
              if (!active) return;
              setMeeting(updated);
              setEditFilename(updated.filename || "");
              setEditSummary(updated.summary || "");
              if (updated.action_item_status_map) {
                setStatusMap(updated.action_item_status_map);
              }
              if (updated.status !== "processing" && pollTimer) {
                window.clearInterval(pollTimer);
              }
            } catch {
              if (pollTimer) window.clearInterval(pollTimer);
            } finally {
              inFlight = false;
            }
          }, 1500);
        }
      } catch (error) {
        console.error("Failed to load meeting:", error);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadMeeting();

    return () => {
      active = false;
      if (pollTimer) window.clearInterval(pollTimer);
    };
  }, [id]);

  async function handleToggleTask(task: string) {
    const current = statusMap[task] || "Pending";
    const nextStatus: "Pending" | "Completed" = current === "Completed" ? "Pending" : "Completed";
    setUpdatingTask(task);
    try {
      await updateActionItemStatus(id, task, nextStatus);
      setStatusMap((prev) => ({ ...prev, [task]: nextStatus }));
      toast.success(`Task marked as ${nextStatus.toLowerCase()}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update task");
    } finally {
      setUpdatingTask(null);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!meeting) return;
    const trimmedTitle = editFilename.trim();
    if (!trimmedTitle) {
      toast.error("Meeting title cannot be empty.");
      return;
    }
    setSavingEdit(true);
    try {
      const updated = await updateMeeting(id, {
        filename: trimmedTitle,
        summary: editSummary.trim(),
      });
      setMeeting((prev) =>
        prev
          ? {
              ...prev,
              filename: updated.filename,
              summary: updated.summary,
              mom: updated.mom,
              ...(updated.mom_sections ? { mom_sections: updated.mom_sections } : {}),
            }
          : prev,
      );
      setEditing(false);
      toast.success("Meeting details updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update meeting.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleRetryProcessing() {
    setRetrying(true);
    try {
      await retryMeeting(id, false);
      const refreshed = await getMeeting(id);
      setMeeting(refreshed);
      if (refreshed.action_item_status_map) {
        setStatusMap(refreshed.action_item_status_map);
      }
      toast.success("Meeting reprocessed successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Retry failed.");
      try {
        const refreshed = await getMeeting(id);
        setMeeting(refreshed);
      } catch {
        /* ignore */
      }
    } finally {
      setRetrying(false);
    }
  }

  async function confirmDeleteCurrentMeeting() {
    setDeleting(true);
    try {
      await deleteMeeting(id);
      toast.success("Meeting deleted successfully.");
      setShowDeleteConfirm(false);
      navigate({ to: "/meetings" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete meeting.");
      setDeleting(false);
    }
  }

  function seekAudio(seconds: number) {
    const el = transcriptAudioRef.current || overviewAudioRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, seconds);
    el.play().catch(() => {});
  }

  function copyText(text: string, label: string) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard.`);
  }

  function downloadFile(content: string, extension: string, mimeType: string) {
    if (!meeting) return;
    const baseName = (meeting.filename || "meeting-report")
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_");
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${baseName}_MeetingMind.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported meeting report (.${extension}).`);
  }

  function handleExport(format: "md" | "txt" | "json") {
    if (!meeting) return;
    const secs = meeting.mom_sections ?? {
      discussion: [],
      decisions: [],
      actions: [],
      deadlines: [],
    };
    const segs = meeting.transcript_segments ?? [];

    if (format === "json") {
      const payload = {
        id: meeting.id,
        filename: meeting.filename,
        created_at: meeting.created_at,
        duration_seconds: meeting.duration_seconds,
        status: meeting.status,
        summary: meeting.summary,
        mom_sections: secs,
        action_item_status_map: statusMap,
        transcript: meeting.transcript,
        transcript_segments: segs,
      };
      downloadFile(JSON.stringify(payload, null, 2), "json", "application/json;charset=utf-8");
      return;
    }

    const segLines =
      segs.length > 0
        ? segs.map((s) => `[${s.timestamp}] ${s.speaker}: ${s.text}`).join("\n")
        : meeting.transcript || "No transcript available.";

    if (format === "md") {
      const md = [
        `# MeetingMind — Meeting Report`,
        ``,
        `- **Recording:** ${meeting.filename}`,
        `- **Date:** ${meeting.created_at ? new Date(meeting.created_at).toLocaleString() : "N/A"}`,
        `- **Duration:** ${formatDuration(meeting.duration_seconds)}`,
        ``,
        `## Executive Summary`,
        `${meeting.summary || "No summary available."}`,
        ``,
        `## Key Decisions`,
        ...(secs.decisions.length ? secs.decisions.map((d) => `- ${d}`) : ["- None recorded"]),
        ``,
        `## Action Items`,
        ...(secs.actions.length
          ? secs.actions.map((a) => `- [${statusMap[a] === "Completed" ? "x" : " "}] ${a}`)
          : ["- None assigned"]),
        ``,
        `## Discussion Points`,
        ...(secs.discussion.length ? secs.discussion.map((d) => `- ${d}`) : ["- None recorded"]),
        ``,
        `## Deadlines`,
        ...(secs.deadlines.length ? secs.deadlines.map((d) => `- ${d}`) : ["- None mentioned"]),
        ``,
        `## Transcript`,
        segLines,
      ].join("\n");
      downloadFile(md, "md", "text/markdown;charset=utf-8");
      return;
    }

    const txt = [
      `MEETINGMIND - MEETING REPORT`,
      `============================`,
      `Recording: ${meeting.filename}`,
      `Date: ${meeting.created_at ? new Date(meeting.created_at).toLocaleString() : "N/A"}`,
      `Duration: ${formatDuration(meeting.duration_seconds)}`,
      ``,
      `EXECUTIVE SUMMARY`,
      `-----------------`,
      `${meeting.summary || "No summary available."}`,
      ``,
      `${meeting.mom || ""}`,
      ``,
      `TRANSCRIPT`,
      `----------`,
      segLines,
    ].join("\n");
    downloadFile(txt, "txt", "text/plain;charset=utf-8");
  }

  if (loading) {
    return (
      <AppShell>
        <PageHeader
          eyebrow="Meeting Workspace"
          title="Loading meeting..."
          description="Fetching transcript, summary, and Minutes of Meeting."
        />
        <Card className="flex items-center gap-2.5 p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading meeting details...
        </Card>
      </AppShell>
    );
  }

  if (!meeting) {
    return (
      <AppShell>
        <PageHeader
          eyebrow="Meeting Workspace"
          title="Meeting Not Found"
          description="The requested meeting does not exist or you do not have permission to view it."
          action={
            <Button asChild variant="outline">
              <Link to="/meetings">Back to Meetings</Link>
            </Button>
          }
        />
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">
            Verify the meeting link or return to your Meetings library.
          </p>
        </Card>
      </AppShell>
    );
  }

  const transcriptText = meeting.transcript || "";
  const transcriptLines = transcriptText
    .split(/(?<=[.!?])\s+/)
    .map((text: string) => text.trim())
    .filter(Boolean);

  const rawSegments: TranscriptSegment[] =
    meeting.transcript_segments && meeting.transcript_segments.length > 0
      ? meeting.transcript_segments
      : transcriptLines.map((text: string, idx: number) => ({
          index: idx + 1,
          start: idx * 5,
          end: (idx + 1) * 5,
          timestamp: `${String(Math.floor((idx * 5) / 60)).padStart(2, "0")}:${String((idx * 5) % 60).padStart(2, "0")} - ${String(Math.floor(((idx + 1) * 5) / 60)).padStart(2, "0")}:${String(((idx + 1) * 5) % 60).padStart(2, "0")}`,
          speaker: `Segment ${idx + 1}`,
          text,
        }));

  const filteredSegments = rawSegments.filter(
    (seg) =>
      seg.text.toLowerCase().includes(search.toLowerCase()) ||
      seg.speaker.toLowerCase().includes(search.toLowerCase()) ||
      seg.timestamp.toLowerCase().includes(search.toLowerCase()),
  );

  const momSections = meeting.mom_sections ?? {
    discussion: [],
    decisions: [],
    actions: [],
    deadlines: [],
  };

  // Fallback parse if mom_sections wasn't populated
  if (
    momSections.discussion.length === 0 &&
    momSections.decisions.length === 0 &&
    momSections.actions.length === 0 &&
    typeof meeting.mom === "string"
  ) {
    let currentSection: keyof typeof momSections | "" = "";
    meeting.mom.split("\n").forEach((line: string) => {
      const text = line.trim();
      if (!text) return;
      const lower = text.toLowerCase();
      if (lower.startsWith("discussion")) {
        currentSection = "discussion";
        return;
      }
      if (lower.startsWith("decision")) {
        currentSection = "decisions";
        return;
      }
      if (lower.startsWith("action item")) {
        currentSection = "actions";
        return;
      }
      if (lower.startsWith("deadline")) {
        currentSection = "deadlines";
        return;
      }
      if (text.startsWith("-") && currentSection) {
        const item = text.replace(/^-\s*/, "").trim();
        if (item && !item.toLowerCase().startsWith("no explicit")) {
          momSections[currentSection].push(item);
        }
      }
    });
  }

  const created = meeting.created_at ? new Date(meeting.created_at) : null;
  const date = created ? created.toLocaleDateString() : "Date not recorded";
  const time = created
    ? created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <AppShell>
      <PageHeader
        eyebrow="Meeting Workspace"
        title={meeting.filename}
        description={`${time ? `${date} · ${time}` : date}${
          meeting.duration_seconds ? ` · Duration: ${formatDuration(meeting.duration_seconds)}` : ""
        }${
          meeting.processing_time_seconds
            ? ` · Processed in ${meeting.processing_time_seconds}s`
            : ""
        }`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={meeting.status || "Processed"} />

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditFilename(meeting.filename || "");
                setEditSummary(meeting.summary || "");
                setEditing((v) => !v);
              }}
            >
              <Edit3 className="size-3.5" />
              Edit
            </Button>

            <Button variant="outline" size="sm" onClick={() => handleExport("md")}>
              <Download className="size-3.5" />
              Export .MD
            </Button>

            <Button variant="outline" size="sm" onClick={() => handleExport("txt")}>
              <Download className="size-3.5" />
              .TXT
            </Button>

            <Button variant="outline" size="sm" onClick={() => handleExport("json")}>
              <Download className="size-3.5" />
              .JSON
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={deleting}
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="size-4" />
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        }
      />

      {editing && (
        <Card className="mb-6 p-5">
          <div className="mb-4 flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Edit Meeting Title &amp; Summary
              </h3>
              <p className="text-xs text-muted-foreground">
                Customize the recording title or refine the executive summary
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setEditing(false)}>
              <X className="size-4" />
            </Button>
          </div>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <label className="block text-sm font-medium text-foreground">
              Meeting Title
              <Input
                className="mt-1.5 text-sm font-normal text-foreground"
                value={editFilename}
                onChange={(e) => setEditFilename(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-medium text-foreground">
              Executive Summary
              <textarea
                rows={4}
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal leading-6 text-foreground outline-none focus:ring-2 focus:ring-ring/30"
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={savingEdit}>
                {savingEdit ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {meeting.status === "processing" && (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary-soft/80 via-primary-soft/40 to-card p-5 text-sm shadow-xs transition-all animate-page-enter"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                <Loader2 className="size-5 animate-spin" />
              </span>
              <div>
                <p className="font-semibold text-foreground">AI Pipeline In Progress</p>
                <p className="text-xs text-muted-foreground">
                  {meeting.processing_stage ||
                    "Transcribing audio and generating executive notes..."}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <span className="size-1.5 rounded-full bg-primary animate-ping" />
              Live Analysis
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 border-t border-border/60 pt-3 sm:grid-cols-3">
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all duration-300",
                meeting.processing_stage?.toLowerCase().includes("transcri") ||
                  meeting.processing_stage?.toLowerCase().includes("flan") ||
                  meeting.processing_stage?.toLowerCase().includes("summary")
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium"
                  : "border-primary bg-primary-soft text-primary font-semibold shadow-xs",
              )}
            >
              <span className="font-mono text-[10px] font-bold">1</span>
              <span>Audio Extraction</span>
            </div>

            <div
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all duration-300",
                meeting.processing_stage?.toLowerCase().includes("flan") ||
                  meeting.processing_stage?.toLowerCase().includes("summary")
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium"
                  : meeting.processing_stage?.toLowerCase().includes("transcri")
                    ? "border-primary bg-primary-soft text-primary font-semibold shadow-xs"
                    : "border-border bg-card/60 text-muted-foreground",
              )}
            >
              <span className="font-mono text-[10px] font-bold">2</span>
              <span>Whisper Speech-to-Text</span>
            </div>

            <div
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all duration-300",
                meeting.processing_stage?.toLowerCase().includes("summary") ||
                  meeting.processing_stage?.toLowerCase().includes("flan")
                  ? "border-primary bg-primary-soft text-primary font-semibold shadow-xs"
                  : "border-border bg-card/60 text-muted-foreground",
              )}
            >
              <span className="font-mono text-[10px] font-bold">3</span>
              <span>FLAN-T5 Summary & MoM</span>
            </div>
          </div>
        </div>
      )}

      {meeting.status === "failed" && (
        <div className="mb-6 flex flex-col justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-semibold">Processing Failed</p>
              <p className="mt-1 text-xs">
                {meeting.error_message || "An error occurred while processing this recording."}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={retrying}
            onClick={handleRetryProcessing}
            className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/15"
          >
            {retrying ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="size-3.5" />
                Retry Processing
              </>
            )}
          </Button>
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="mb-5 flex h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-1">
          <TabsTrigger value="overview">Overview &amp; Summary</TabsTrigger>
          <TabsTrigger value="minutes">Minutes of Meeting</TabsTrigger>
          <TabsTrigger value="actions">Action Items ({momSections.actions.length})</TabsTrigger>
          <TabsTrigger value="transcript">Transcript ({rawSegments.length})</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
            <div className="space-y-6">
              <Card>
                <div className="flex items-center justify-between border-b border-border bg-muted/20 px-5 py-4">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">Executive Summary</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Key takeaways from the recorded conversation
                    </p>
                  </div>
                  {meeting.summary && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => copyText(meeting.summary ?? "", "Summary")}
                    >
                      <Copy className="mr-1 size-3.5" />
                      Copy
                    </Button>
                  )}
                </div>

                <div className="p-5 text-sm leading-7 text-foreground/90 space-y-3.5">
                  {meeting.summary ? (
                    meeting.summary.split("\n\n").map((block, bIdx) => {
                      const trimmed = block.trim();
                      if (!trimmed) return null;
                      if (trimmed.startsWith("### ")) {
                        const lines = trimmed.split("\n");
                        const heading = (lines[0] || "").replace(/^###\s*/, "");
                        const body = lines.slice(1).join("\n").trim();
                        return (
                          <div
                            key={bIdx}
                            className="rounded-xl border border-border/70 bg-muted/15 p-4 transition-colors hover:border-primary/25"
                          >
                            <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                              {heading}
                            </h3>
                            <div className="mt-2 text-sm leading-6 text-foreground/90 whitespace-pre-line">
                              {body}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <p key={bIdx} className="leading-relaxed">
                          {trimmed}
                        </p>
                      );
                    })
                  ) : (
                    <p className="text-muted-foreground">No summary available for this meeting.</p>
                  )}
                </div>
              </Card>

              <Card>
                <CardHead
                  title="Key Decisions"
                  note="Agreed outcomes captured from the discussion"
                />
                <div className="p-5">
                  {momSections.decisions.length > 0 ? (
                    <ul className="space-y-2.5">
                      {momSections.decisions.map((decision, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-sm leading-6">
                          <CheckCircle2 className="mt-1 size-4 shrink-0 text-success" />
                          <span>{decision}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No explicit decisions were identified in this recording.
                    </p>
                  )}
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
                <MiniInsight
                  icon={FileText}
                  label="Transcript Segments"
                  value={`${rawSegments.length} segments`}
                />
                <MiniInsight
                  icon={CheckCircle2}
                  label="Decisions Captured"
                  value={`${momSections.decisions.length} decisions`}
                />
                <MiniInsight
                  icon={ListChecks}
                  label="Action Items"
                  value={`${momSections.actions.length} tasks`}
                />
              </div>

              {meeting.has_audio && (
                <Card className="p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Volume2 className="size-4 text-primary" />
                    <p className="text-sm font-semibold">Recording Playback</p>
                  </div>
                  <audio
                    ref={overviewAudioRef}
                    controls
                    className="h-10 w-full rounded-lg outline-none"
                    src={getAudioUrl(id)}
                  >
                    Your browser does not support the audio element.
                  </audio>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* MINUTES OF MEETING TAB */}
        <TabsContent value="minutes">
          <Card>
            <div className="flex items-center justify-between border-b border-border bg-muted/20 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Minutes of Meeting (MoM)
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Structured discussion points, decisions, action items, and deadlines
                </p>
              </div>
              {meeting.mom && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => copyText(meeting.mom ?? "", "Minutes of Meeting")}
                >
                  <Copy className="mr-1 size-3.5" />
                  Copy Minutes
                </Button>
              )}
            </div>

            <div className="grid gap-7 p-6">
              <MinutesSection
                title="Meeting Metadata"
                items={[
                  `File: ${meeting.filename}`,
                  `Date: ${date}${time ? ` at ${time}` : ""}`,
                  `Duration: ${formatDuration(meeting.duration_seconds)}`,
                ]}
              />

              <MinutesSection
                title="Discussion Points"
                items={
                  momSections.discussion.length
                    ? momSections.discussion
                    : ["No key discussion points identified."]
                }
              />

              <MinutesSection
                title="Decisions Taken"
                items={
                  momSections.decisions.length
                    ? momSections.decisions
                    : ["No explicit decisions recorded."]
                }
              />

              <MinutesSection
                title="Action Items"
                items={
                  momSections.actions.length ? momSections.actions : ["No action items assigned."]
                }
              />

              <MinutesSection
                title="Deadlines & Target Dates"
                items={
                  momSections.deadlines.length
                    ? momSections.deadlines
                    : ["No explicit deadlines mentioned."]
                }
              />
            </div>
          </Card>
        </TabsContent>

        {/* ACTION ITEMS TAB */}
        <TabsContent value="actions">
          <Card>
            <CardHead
              title="Extracted Action Items"
              note="Toggle task completion status directly"
            />
            <div className="p-6">
              {momSections.actions.length ? (
                <div className="space-y-3">
                  {momSections.actions.map((item: string, index: number) => {
                    const curStatus = statusMap[item] || "Pending";
                    return (
                      <div
                        key={index}
                        className="flex flex-col justify-between gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/15 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "text-sm font-medium text-foreground",
                              curStatus === "Completed" && "line-through text-muted-foreground",
                            )}
                          >
                            {item}
                          </p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <StatusBadge status={curStatus} />
                            <span className="text-xs text-muted-foreground">
                              Extracted from Minutes of Meeting
                            </span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant={curStatus === "Completed" ? "outline" : "default"}
                          disabled={updatingTask === item}
                          onClick={() => handleToggleTask(item)}
                          className="shrink-0 text-xs"
                        >
                          {curStatus === "Completed" ? "Mark Pending" : "Mark Done"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No action items were extracted from this meeting.
                </p>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* TRANSCRIPT TAB */}
        <TabsContent value="transcript">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <Card>
              <div className="flex items-center justify-between gap-2 border-b p-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search within transcript or timestamp..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                {transcriptText && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs"
                    onClick={() => copyText(transcriptText, "Full transcript")}
                  >
                    <Copy className="mr-1 size-3.5" />
                    Copy Transcript
                  </Button>
                )}
              </div>

              <div className="max-h-[600px] divide-y divide-border overflow-y-auto">
                {filteredSegments.length ? (
                  filteredSegments.map((seg) => (
                    <div
                      key={seg.index}
                      className="flex flex-col gap-2 p-4 transition-colors hover:bg-muted/15 sm:flex-row sm:items-start sm:gap-4"
                    >
                      <div className="flex shrink-0 items-center gap-2 sm:w-44">
                        <button
                          type="button"
                          onClick={() => seekAudio(seg.start)}
                          title="Click to jump audio to this timestamp"
                          className="rounded border border-border bg-muted/50 px-2 py-0.5 font-mono text-[11px] text-primary transition hover:border-primary/50 hover:bg-primary/10"
                        >
                          {seg.timestamp}
                        </button>
                        <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-primary">
                          {seg.speaker}
                        </span>
                      </div>
                      <p className="flex-1 text-sm leading-6 text-foreground">{seg.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="p-6 text-sm text-muted-foreground">
                    {search
                      ? "No transcript segments match your search query."
                      : "No transcript available."}
                  </p>
                )}
              </div>
            </Card>

            <Card className="h-fit p-5">
              <div className="mb-3 flex items-center gap-2">
                <Volume2 className="size-4 text-primary" />
                <p className="text-sm font-semibold">Audio Playback</p>
              </div>

              {meeting.has_audio ? (
                <div className="space-y-3">
                  <audio
                    ref={transcriptAudioRef}
                    controls
                    className="h-10 w-full rounded-lg outline-none"
                    src={getAudioUrl(id)}
                  >
                    Your browser does not support audio playback.
                  </audio>
                  <p className="text-xs text-muted-foreground">
                    Click any timestamp badge in the transcript to jump directly to that moment.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg bg-muted/30 p-6 text-center">
                  <Headphones className="mx-auto mb-2 size-6 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    Audio file is not stored on disk for this record.
                  </p>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Meeting Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={showDeleteConfirm}
        onOpenChange={(open) => {
          if (!open && !deleting) setShowDeleteConfirm(false);
        }}
        title="Delete Meeting"
        description="Permanently delete this meeting recording, Whisper transcription, and AI summary. This action cannot be undone."
        targetItem={meeting?.filename}
        deleteLabel="Delete Meeting"
        isDeleting={deleting}
        onConfirm={confirmDeleteCurrentMeeting}
      />
    </AppShell>
  );
}

function MiniInsight({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Lightbulb;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-lg bg-primary-soft text-primary">
          <Icon className="size-4.5" />
        </span>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-display text-lg font-bold text-foreground">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function MinutesSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((x, idx) => (
          <li key={idx} className="flex gap-3 text-sm leading-6 text-muted-foreground">
            <Sparkles className="mt-1 size-3.5 shrink-0 text-primary" />
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
