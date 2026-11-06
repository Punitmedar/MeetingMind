import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "rounded-2xl border border-border/80 bg-card p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-[26px]">
            {value}
          </p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary transition-transform duration-200 group-hover:scale-105">
          <Icon className="size-4.5" />
        </span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{note}</p>
    </article>
  );
}
