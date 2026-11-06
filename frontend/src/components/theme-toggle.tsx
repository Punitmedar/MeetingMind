import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getTheme, setTheme, type Theme } from "@/lib/theme";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    setThemeState(getTheme());
    const onChange = (e: Event) => setThemeState((e as CustomEvent<Theme>).detail);
    window.addEventListener("meetingmind-theme", onChange);
    return () => window.removeEventListener("meetingmind-theme", onChange);
  }, []);

  const next: Theme = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={cn(
        "inline-grid size-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-primary",
        className,
      )}
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
