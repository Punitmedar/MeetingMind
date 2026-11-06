import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  FileAudio2,
  LayoutDashboard,
  ListChecks,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Brand } from "@/components/app-shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { isAdmin, isAuthenticated } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MeetingMind — Every Meeting Deserves a Clear Outcome" },
      {
        name: "description",
        content:
          "Turn conversations into meaningful summaries, decisions and action items with MeetingMind.",
      },
    ],
  }),
  component: Landing,
});

const workflowSteps = [
  {
    step: "01",
    icon: Upload,
    title: "Upload your recording",
    description: "Add an audio or video file from any meeting.",
  },
  {
    step: "02",
    icon: Sparkles,
    title: "Review summary & decisions",
    description: "Read the executive summary and the decisions that were made.",
  },
  {
    step: "03",
    icon: ListChecks,
    title: "Track action items",
    description: "Follow up on tasks and owners from one workspace.",
  },
];

const features = [
  {
    icon: FileAudio2,
    title: "Transcription",
    description: "Convert audio and video recordings into timestamped text with Whisper.",
  },
  {
    icon: Sparkles,
    title: "Summary & minutes",
    description: "Get an executive summary and structured minutes of the meeting.",
  },
  {
    icon: CheckCircle2,
    title: "Decisions",
    description: "See the decisions that were confirmed, separate from open suggestions.",
  },
  {
    icon: ListChecks,
    title: "Action items",
    description: "Track tasks with owners and deadlines when they are mentioned.",
  },
];

function Landing() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    setLoggedIn(isAuthenticated());
    setAdmin(isAdmin());
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EEEAFB] to-[#F6F4FD] p-1.5 text-foreground sm:p-4 lg:p-5 dark:from-workspace dark:to-background">
      <div className="mx-auto flex min-h-[calc(100vh-0.75rem)] max-w-[1440px] flex-col overflow-hidden rounded-[20px] border border-border/70 bg-card shadow-[0_20px_60px_-24px_rgba(68,54,162,0.18)] sm:min-h-[calc(100vh-2rem)] sm:rounded-[28px]">
        {/* NAVBAR */}
        <header className="sticky top-0 z-30 border-b border-border/60 bg-card/90 backdrop-blur-md">
          <div className="mx-auto flex h-14 w-full max-w-[1240px] items-center justify-between gap-2 px-3 sm:h-[68px] sm:px-6 lg:px-8">
            <Brand />

            <div className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
              <a href="#features" className="transition-colors hover:text-foreground">
                Workspace
              </a>
              <a href="#workflow" className="transition-colors hover:text-foreground">
                How it Works
              </a>
            </div>

            <nav className="flex shrink-0 items-center gap-1 sm:gap-2.5">
              <ThemeToggle className="size-8 sm:size-9" />
              {loggedIn ? (
                <>
                  {admin && (
                    <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                      <Link to="/admin">
                        <ShieldCheck className="size-4" />
                        Admin
                      </Link>
                    </Button>
                  )}
                  <Button asChild variant="outline" size="sm" className="px-2.5 sm:px-3.5">
                    <Link to="/dashboard">
                      <LayoutDashboard className="size-4" />
                      <span className="hidden min-[360px]:inline">Dashboard</span>
                    </Link>
                  </Button>
                  <Button asChild size="sm" className="px-2.5 text-xs sm:px-4 sm:text-sm">
                    <Link to="/upload">
                      <Upload className="size-3.5" />
                      <span className="hidden sm:inline">Upload Meeting</span>
                      <span className="sm:hidden">Upload</span>
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="px-2 text-xs text-muted-foreground hover:text-foreground sm:px-3.5 sm:text-sm"
                  >
                    <Link to="/login">Sign In</Link>
                  </Button>
                  <Button asChild size="sm" className="px-2.5 text-xs sm:px-4 sm:text-sm">
                    <Link to="/register">Get Started</Link>
                  </Button>
                </>
              )}
            </nav>
          </div>
        </header>

        <main className="flex-1">
          {/* HERO */}
          <section className="relative overflow-hidden border-b border-border/70 bg-gradient-to-b from-[#F4F1FF] to-card pt-10 pb-12 sm:pt-16 sm:pb-16 lg:pt-20 lg:pb-20 dark:from-primary-soft/40">
            <div className="relative z-10 mx-auto w-full max-w-[1240px] px-3.5 sm:px-6 lg:px-8">
              <div className="animate-mm-fade-up mx-auto max-w-2xl text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-card px-2.5 py-1 text-[10px] font-semibold tracking-[0.05em] text-primary uppercase sm:px-3.5 sm:text-[11px] sm:tracking-[0.08em]">
                  <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                  MEETING INTELLIGENCE WORKSPACE
                </span>

                <h1 className="mt-4 text-[28px] leading-[1.15] font-semibold tracking-[-0.03em] text-foreground sm:mt-5 sm:text-[44px] lg:text-[52px]">
                  Every meeting deserves a clear outcome.
                </h1>

                <p className="mx-auto mt-3.5 max-w-xl text-sm leading-relaxed text-muted-foreground sm:mt-4 sm:text-[17px] sm:leading-7">
                  Turn conversations into meaningful summaries, decisions and action items.
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 sm:mt-8 sm:gap-3">
                  <Button
                    asChild
                    size="lg"
                    className="h-11 rounded-xl px-6 text-sm font-semibold shadow-[0_10px_26px_-6px_rgba(91,79,233,0.5)]"
                  >
                    <Link to={loggedIn ? "/dashboard" : "/register"}>
                      Get Started
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-11 rounded-xl bg-card px-5 text-sm font-medium sm:px-6"
                  >
                    <a href="#features">Explore MeetingMind</a>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* CAPABILITIES (real product features, no sample data) */}
          <section
            id="features"
            className="mx-auto w-full max-w-[1240px] scroll-mt-20 px-4 py-12 sm:px-6 sm:py-16 lg:px-8"
          >
            <div className="mx-auto max-w-xl text-center">
              <span className="inline-flex items-center rounded-full bg-primary-soft px-3 py-1 text-[11px] font-semibold tracking-wider text-primary uppercase">
                Features
              </span>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Everything a meeting needs, in one workspace
              </h2>
            </div>

            <ul className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
              {features.map((item) => (
                <li
                  key={item.title}
                  className="rounded-2xl border border-border bg-card p-5 shadow-card"
                >
                  <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
                    <item.icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* HOW IT WORKS */}
          <section
            id="workflow"
            className="mx-auto w-full max-w-[1240px] scroll-mt-20 px-4 py-12 sm:px-6 sm:py-16 lg:px-8"
          >
            <div className="mx-auto max-w-xl text-center">
              <span className="inline-flex items-center rounded-full bg-primary-soft px-3 py-1 text-[11px] font-semibold tracking-wider text-primary uppercase">
                How It Works
              </span>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-foreground sm:text-3xl">
                From recording to clarity in three steps
              </h2>
            </div>

            <ol className="mt-8 grid gap-4 sm:mt-10 sm:gap-5 md:grid-cols-3">
              {workflowSteps.map((item) => (
                <li
                  key={item.step}
                  className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
                      <item.icon className="size-5" />
                    </span>
                    <span className="font-mono text-xs font-semibold text-primary/80">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </main>

        {/* FOOTER */}
        <footer className="border-t border-border/70 bg-card">
          <div className="mx-auto grid w-full max-w-[1240px] gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
            <div>
              <Brand />
              <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
                Meeting transcripts, summaries, decisions and action items in one workspace.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold tracking-wider text-foreground uppercase">
                Product
              </p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link to="/dashboard" className="transition-colors hover:text-primary">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/meetings" className="transition-colors hover:text-primary">
                    Meetings
                  </Link>
                </li>
                <li>
                  <Link to="/upload" className="transition-colors hover:text-primary">
                    Upload Meeting
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold tracking-wider text-foreground uppercase">
                Account
              </p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {loggedIn ? (
                  <li>
                    <Link to="/settings" className="transition-colors hover:text-primary">
                      Settings
                    </Link>
                  </li>
                ) : (
                  <>
                    <li>
                      <Link to="/login" className="transition-colors hover:text-primary">
                        Sign In
                      </Link>
                    </li>
                    <li>
                      <Link to="/register" className="transition-colors hover:text-primary">
                        Get Started
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>

          <div className="border-t border-border/70">
            <p className="mx-auto w-full max-w-[1240px] px-4 py-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
              © {new Date().getFullYear()} MeetingMind. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
