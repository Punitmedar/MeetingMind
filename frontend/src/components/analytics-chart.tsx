import React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { type AnalyticsResponse, getAnalytics } from "@/lib/api";

const config = {
  meetings: {
    label: "Meetings",
    color: "var(--color-primary)",
  },
  actions: {
    label: "Action items",
    color: "var(--color-chart-2)",
  },
};

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-");
  const date = new Date(Number(year), Number(monthNumber) - 1, 1);

  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function SingleMonthCard({ month, value, label }: { month: string; value: number; label: string }) {
  return (
    <div className="flex h-60 flex-col justify-center px-5">
      <p className="text-xs font-medium text-muted-foreground">Current period</p>

      <p className="mt-1.5 text-xl font-semibold text-foreground">{month}</p>

      <div className="mt-5 flex items-end justify-between border-t border-border pt-4">
        <div>
          <p className="text-3xl font-semibold text-foreground">{value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{label}</p>
        </div>

        <div className="rounded-lg bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
          Active period
        </div>
      </div>
    </div>
  );
}

export function MeetingsAreaChart({
  analyticsData,
  loading: externalLoading,
}: {
  analyticsData?: AnalyticsResponse | null;
  loading?: boolean;
} = {}) {
  const [internalData, setInternalData] = React.useState<{ month: string; meetings: number }[]>([]);
  const [internalLoading, setInternalLoading] = React.useState(analyticsData === undefined);

  React.useEffect(() => {
    if (analyticsData !== undefined) {
      if (analyticsData) {
        const chartData = Object.entries(analyticsData.meetings || {})
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, meetings]) => ({
            month: formatMonth(month),
            meetings,
          }));
        setInternalData(chartData);
      }
      setInternalLoading(false);
      return;
    }

    getAnalytics()
      .then((result) => {
        const chartData = Object.entries(result.meetings || {})
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, meetings]) => ({
            month: formatMonth(month),
            meetings,
          }));

        setInternalData(chartData);
      })
      .catch((err: Error) => {
        console.error("Failed to load meeting analytics:", err);
      })
      .finally(() => setInternalLoading(false));
  }, [analyticsData]);

  const isLoading = externalLoading !== undefined ? externalLoading : internalLoading;

  if (isLoading) {
    return (
      <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
        Loading activity...
      </div>
    );
  }

  if (internalData.length === 0) {
    return (
      <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
        No meeting activity recorded yet.
      </div>
    );
  }

  if (internalData.length === 1) {
    const currentMonth = internalData[0];
    if (!currentMonth) return null;

    return (
      <SingleMonthCard
        month={currentMonth.month}
        value={currentMonth.meetings}
        label="meetings processed"
      />
    );
  }

  return (
    <ChartContainer config={config} className="h-60 w-full">
      <BarChart data={internalData} margin={{ left: 0, right: 8, top: 16, bottom: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar
          dataKey="meetings"
          fill="var(--color-meetings)"
          radius={[6, 6, 0, 0]}
          maxBarSize={80}
        />
      </BarChart>
    </ChartContainer>
  );
}

export function ActionsBarChart({
  analyticsData,
  loading: externalLoading,
}: {
  analyticsData?: AnalyticsResponse | null;
  loading?: boolean;
} = {}) {
  const [internalData, setInternalData] = React.useState<{ month: string; actions: number }[]>([]);
  const [internalLoading, setInternalLoading] = React.useState(analyticsData === undefined);

  React.useEffect(() => {
    if (analyticsData !== undefined) {
      if (analyticsData) {
        const chartData = Object.entries(analyticsData.actions || {})
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, actions]) => ({
            month: formatMonth(month),
            actions,
          }));
        setInternalData(chartData);
      }
      setInternalLoading(false);
      return;
    }

    getAnalytics()
      .then((result) => {
        const chartData = Object.entries(result.actions || {})
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, actions]) => ({
            month: formatMonth(month),
            actions,
          }));

        setInternalData(chartData);
      })
      .catch((err: Error) => {
        console.error("Failed to load action analytics:", err);
      })
      .finally(() => setInternalLoading(false));
  }, [analyticsData]);

  const isLoading = externalLoading !== undefined ? externalLoading : internalLoading;

  if (isLoading) {
    return (
      <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
        Loading activity...
      </div>
    );
  }

  if (internalData.length === 0) {
    return (
      <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
        No action-item activity recorded yet.
      </div>
    );
  }

  if (internalData.length === 1) {
    const currentMonth = internalData[0];
    if (!currentMonth) return null;

    return (
      <SingleMonthCard
        month={currentMonth.month}
        value={currentMonth.actions}
        label="action items captured"
      />
    );
  }

  return (
    <ChartContainer config={config} className="h-60 w-full">
      <BarChart data={internalData} margin={{ left: 0, right: 8, top: 16, bottom: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar dataKey="actions" fill="var(--color-actions)" radius={[6, 6, 0, 0]} maxBarSize={80} />
      </BarChart>
    </ChartContainer>
  );
}
