import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  AudioWaveform,
  BarChart3,
  CheckSquare2,
  CircleUserRound,
  FileAudio2,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { getMe, isAdmin, logoutUser } from "@/lib/api";
import { getTheme, setTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const nav = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Meetings",
    to: "/meetings",
    icon: FileAudio2,
  },
  {
    label: "Upload Meeting",
    to: "/upload",
    icon: Upload,
  },
  {
    label: "Action Items",
    to: "/action-items",
    icon: CheckSquare2,
  },
  {
    label: "Analytics",
    to: "/analytics",
    icon: BarChart3,
  },
  {
    label: "Settings",
    to: "/settings",
    icon: Settings,
  },
] as const;

export function Brand({
  compact = false,
  inverted = false,
}: {
  compact?: boolean;
  inverted?: boolean;
}) {
  return (
    <Link to="/" className="inline-flex items-center gap-2.5">
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-xl shadow-xs transition-transform",
          inverted ? "bg-white text-[#5B4FE9]" : "bg-[#5B4FE9] text-white",
        )}
      >
        <AudioWaveform className="size-4.5" />
      </span>

      {!compact && (
        <span
          className={cn(
            "text-[17px] font-semibold tracking-tight",
            inverted ? "text-white" : "text-foreground",
          )}
        >
          MeetingMind
        </span>
      )}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [adminUser, setAdminUser] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dark, setDark] = useState(() =>
    typeof window !== "undefined" ? document.documentElement.classList.contains("dark") : false,
  );

  const navigate = useNavigate();

  const path = useRouterState({
    select: (state) => state.location.pathname,
  });

  useEffect(() => {
    const email = localStorage.getItem("meetiq_email") || "";
    const name = localStorage.getItem("meetiq_name") || "";
    setUserEmail(email || "User");
    setUserName(name);
    setAdminUser(isAdmin());

    const savedSearch = sessionStorage.getItem("meetiq_search");
    setSearchQuery(savedSearch || "");

    setDark(getTheme() === "dark");
    const onTheme = (e: Event) => setDark((e as CustomEvent<string>).detail === "dark");
    window.addEventListener("meetingmind-theme", onTheme);

    getMe()
      .then((profile) => {
        setUserEmail(profile.email);
        setUserName(profile.name || "");
        setAdminUser(profile.role === "admin");
      })
      .catch(() => {
        /* 401 handler in api.ts clears session and redirects */
      });
    return () => window.removeEventListener("meetingmind-theme", onTheme);
  }, []);

  async function handleLogout() {
    await logoutUser();
    navigate({ to: "/login" });
  }

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    setTheme(next ? "dark" : "light");
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      sessionStorage.setItem("meetiq_search", query);
    } else {
      sessionStorage.removeItem("meetiq_search");
    }
    navigate({ to: "/meetings" });
  }

  const displayName = userName || (userEmail ? userEmail.split("@")[0] : "Member");

  return (
    <div className="min-h-screen bg-workspace p-0 sm:p-2.5 lg:p-3.5">
      {/* OUTER FRAMED CONTAINER (Purple Sidebar + White Rounded Workspace) */}
      <div className="mx-auto flex min-h-screen max-w-[1600px] bg-gradient-to-b from-[#5E52EC] via-[#564AE3] to-[#4A3ED6] sm:min-h-[calc(100vh-20px)] sm:rounded-[26px] lg:min-h-[calc(100vh-28px)] lg:rounded-[30px] lg:p-2.5 lg:shadow-[0_24px_60px_-15px_rgba(58,46,145,0.22)]">
        {/* PURPLE VERTICAL NAVIGATION SIDEBAR */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-gradient-to-b from-[#5E52EC] via-[#564AE3] to-[#4A3ED6] px-4 py-5 text-white transition-transform lg:static lg:w-60 lg:shrink-0 lg:translate-x-0 lg:bg-none lg:px-3 lg:py-4",
            open ? "translate-x-0 shadow-2xl" : "-translate-x-full",
          )}
        >
          <div className="flex h-11 items-center justify-between px-2">
            <Brand inverted />

            <button
              type="button"
              className="grid size-8 place-items-center rounded-lg text-white/80 hover:bg-white/15 hover:text-white lg:hidden"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
            >
              <X className="size-4" />
            </button>
          </div>

          <p className="mt-6 px-3 text-[11px] font-medium tracking-wide text-white/60">Menu</p>

          <nav className="mt-2 space-y-1" aria-label="Workspace navigation">
            {nav.map((item) => {
              const active =
                path === item.to || (item.to === "/meetings" && path.startsWith("/meeting/"));

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "group flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all duration-200 ease-out",
                    active
                      ? "bg-white text-[#564AE3] font-semibold shadow-xs translate-x-0.5"
                      : "text-white/85 hover:bg-white/12 hover:text-white hover:translate-x-1",
                  )}
                >
                  <item.icon
                    className={cn(
                      "size-4 shrink-0 transition-transform duration-200 group-hover:scale-105",
                      active ? "text-[#564AE3]" : "text-white/80",
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}

            {adminUser && (
              <>
                <p className="mt-6 px-3 pt-2 text-[11px] font-medium tracking-wide text-white/60">
                  Administration
                </p>
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "group flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all duration-200 ease-out",
                    path === "/admin"
                      ? "bg-white text-[#564AE3] font-semibold shadow-xs translate-x-0.5"
                      : "text-white/85 hover:bg-white/12 hover:text-white hover:translate-x-1",
                  )}
                >
                  <ShieldCheck
                    className={cn(
                      "size-4 shrink-0 transition-transform duration-200 group-hover:scale-105",
                      path === "/admin" ? "text-[#564AE3]" : "text-white/80",
                    )}
                  />
                  Admin Panel
                </Link>
              </>
            )}
          </nav>

          <div className="mt-auto space-y-2.5 border-t border-white/15 pt-4">
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className="flex h-9 items-center gap-2.5 rounded-xl px-3 text-xs font-medium text-white/80 transition-colors hover:bg-white/12 hover:text-white"
            >
              <Home className="size-3.5" />
              Home page
            </Link>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-xs">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-[#564AE3]">
                  <CircleUserRound className="size-4.5" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white">{displayName}</p>
                  <p className="truncate text-[11px] text-white/75">{userEmail}</p>
                </div>

                <span className="shrink-0 rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {adminUser ? "Admin" : "User"}
                </span>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white hover:text-[#564AE3]"
              >
                <LogOut className="size-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        </aside>

        {/* MOBILE OVERLAY */}
        {open && (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-overlay lg:hidden"
            aria-label="Close navigation overlay"
            onClick={() => setOpen(false)}
          />
        )}

        {/* LARGE WHITE ROUNDED DASHBOARD WORKSPACE */}
        <div className="flex min-w-0 flex-1 flex-col bg-background sm:rounded-[22px] lg:rounded-[24px] lg:shadow-xs">
          {/* CLEAN HORIZONTAL TOP NAVIGATION */}
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border/80 bg-card/90 px-4 backdrop-blur-md sm:rounded-t-[22px] sm:px-6 lg:rounded-t-[24px] lg:px-8">
            <div className="flex flex-1 items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="size-5" />
              </Button>

              <form
                onSubmit={handleSearchSubmit}
                className="hidden w-full max-w-md items-center gap-2.5 rounded-xl border border-border bg-muted/60 px-3.5 py-2 text-muted-foreground transition-colors focus-within:border-primary/40 focus-within:bg-card sm:flex"
              >
                <Search className="size-4 shrink-0 text-primary/70" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search meetings, summaries, or transcripts..."
                  className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                  aria-label="Search meetings"
                />
              </form>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
                title={dark ? "Switch to light mode" : "Switch to dark mode"}
                className="rounded-xl bg-muted/60 text-muted-foreground hover:bg-primary-soft hover:text-primary"
              >
                {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </Button>

              <Button asChild size="sm" variant="default" className="rounded-xl px-3.5">
                <Link to="/upload">
                  <Upload className="size-3.5" />
                  <span className="hidden sm:inline">Upload Meeting</span>
                  <span className="sm:hidden">Upload</span>
                </Link>
              </Button>

              <Link
                to="/settings"
                className="hidden items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-primary-soft/40 md:inline-flex"
              >
                <span className="grid size-6 place-items-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary">
                  {(displayName ?? "U").charAt(0).toUpperCase()}
                </span>
                <span className="max-w-[110px] truncate">{displayName ?? "User"}</span>
              </Link>
            </div>
          </header>

          <main
            key={path}
            className="mx-auto w-full max-w-[1360px] flex-1 p-4 sm:p-6 lg:p-8 animate-page-enter transition-all duration-200"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div className="min-w-0">
        {eyebrow && (
          <span className="mb-1.5 inline-flex items-center rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-medium text-primary">
            {eyebrow}
          </span>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[26px]">
          {title}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
