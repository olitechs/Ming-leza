import { Link } from "@tanstack/react-router";
import { Bell, Heart, Settings, SlidersHorizontal } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { MinglezaLogo } from "@/components/MinglezaLogo";

export function TopBar() {
  return (
    <header className="flex items-center justify-between gap-3 py-3">
      <MinglezaLogo className="text-2xl" />
      <div className="flex items-center gap-2">
        <Link
          to="/likes"
          aria-label="Likes"
          title="Likes"
          className="hidden size-10 place-items-center rounded-full border border-border bg-card text-foreground transition hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:grid"
        >
          <Heart aria-hidden="true" className="size-5" />
        </Link>
        <Link
          to="/notifications"
          aria-label="Notifications"
          title="Notifications"
          className="hidden size-10 place-items-center rounded-full border border-border bg-card text-foreground transition hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:grid"
        >
          <Bell aria-hidden="true" className="size-5" />
        </Link>
        <ThemeToggle />
        <Link
          to="/explore"
          aria-label="Explore and discovery"
          title="Explore and discovery"
          className="grid size-10 place-items-center rounded-full border border-border bg-card text-foreground transition hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <SlidersHorizontal aria-hidden="true" className="size-5" />
        </Link>
        <Link
          to="/profile-edit"
          aria-label="Settings and profile"
          title="Settings and profile"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-border bg-card px-3 text-sm font-semibold text-foreground transition hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Settings aria-hidden="true" className="size-4" />
          <span className="hidden sm:inline">Settings</span>
        </Link>
      </div>
    </header>
  );
}
