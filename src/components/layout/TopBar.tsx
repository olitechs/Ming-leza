import { Heart, SlidersHorizontal } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { MinglezaLogo } from "@/components/MinglezaLogo";
import { Link } from "@tanstack/react-router";

export function TopBar({ title = "mingleza" }: { title?: string }) {
  return (
    <header className="flex items-center justify-between py-3">
      <MinglezaLogo className="text-2xl" />
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button
          type="button"
          aria-label="Likes"
          className="grid size-10 place-items-center rounded-full border border-border bg-card text-foreground"
        >
          <Heart className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Discovery filters"
          className="grid size-10 place-items-center rounded-full border border-border bg-card text-foreground"
        >
          <SlidersHorizontal className="size-5" />
        </button>
      </div>
    </header>
  );
}
