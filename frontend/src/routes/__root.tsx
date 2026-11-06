import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-card">
        <p className="text-sm font-semibold text-primary">404 Error</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-[#5146D8]"
          >
            Back to MeetingMind
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error("[MeetingMind App Error]", error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-card">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Unable to load page
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong while loading this view. Try refreshing or return to the home page.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-[#5146D8]"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MeetingMind — Make Every Meeting More Productive" },
      {
        name: "description",
        content:
          "Turn meeting recordings into searchable transcripts, clear summaries, decisions, and actionable tasks with MeetingMind.",
      },
      { name: "author", content: "MeetingMind" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const isLoading = useRouterState({
    select: (state) => state.status === "pending" || state.isLoading,
  });
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  return (
    <QueryClientProvider client={queryClient}>
      {isLoading && (
        <div
          role="progressbar"
          aria-label="Loading page navigation"
          className="fixed inset-x-0 top-0 z-[9999] h-0.5 overflow-hidden bg-primary/20 pointer-events-none"
        >
          <div className="h-full bg-gradient-to-r from-primary/50 via-primary to-[#7065f0] animate-route-progress" />
        </div>
      )}
      <div key={pathname} className="animate-page-enter flex min-h-screen flex-col">
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </div>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
