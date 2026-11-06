import { Link } from "@tanstack/react-router";
import { CalendarDays, CheckCircle2, Clock3, FileAudio2, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

export type MeetingStatus =
  "Processed" | "Completed" | "Processing" | "Failed" | "Pending" | string;

export function StatusBadge({ status, className }: { status: MeetingStatus; className?: string }) {
  const normalized = (status || "").toLowerCase();
  const isComplete = normalized === "processed" || normalized === "completed";
  const isProcessing = normalized === "processing";
  const isFailed = normalized === "failed";
  const isPending = normalized === "pending" || normalized === "ready to process";

  const displayLabel = isComplete
    ? "Completed"
    : isProcessing
      ? "Processing"
      : isFailed
        ? "Failed"
        : isPending
          ? "Pending"
          : status;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors select-none",
        isComplete
          ? "border border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300"
          : isProcessing
            ? "border border-indigo-200/70 bg-indigo-50 text-indigo-700 dark:border-indigo-800/50 dark:bg-indigo-950/40 dark:text-indigo-300"
            : isFailed
              ? "border border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-300"
              : "border border-slate-200/80 bg-slate-100 text-slate-700 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-300",
        className,
      )}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full bg-current", isProcessing && "animate-pulse")}
      />
      <span>{displayLabel}</span>
    </span>
  );
}

export function MeetingRow({
  meeting,
}: {
  meeting: {
    id: string | number;
    title: string;
    date: string;
    duration: string;
    decisionsCount?: number;
    actionsCount?: number;
    summaryPreview?: string;
    status: MeetingStatus;
  };
}) {
  return (
    <Link
      to="/meeting/$id"
      params={{ id: String(meeting.id) }}
      className="grid gap-4 border-b border-border px-5 py-4 transition-colors last:border-0 hover:bg-muted/30 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
    >
      <div className="flex min-w-0 items-start gap-3.5">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
          <FileAudio2 className="size-4.5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{meeting.title}</p>

          {meeting.summaryPreview && (
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
              {meeting.summaryPreview}
            </p>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              {meeting.date}
            </span>

            <span className="flex items-center gap-1.5">
              <Clock3 className="size-3.5" />
              {meeting.duration}
            </span>

            {meeting.decisionsCount !== undefined && (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5" />
                {meeting.decisionsCount} decision{meeting.decisionsCount !== 1 ? "s" : ""}
              </span>
            )}

            {meeting.actionsCount !== undefined && (
              <span className="flex items-center gap-1.5">
                <ListChecks className="size-3.5" />
                {meeting.actionsCount} action item{meeting.actionsCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <StatusBadge status={meeting.status} />
      </div>
    </Link>
  );
}
