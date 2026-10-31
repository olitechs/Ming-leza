import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Compass,
  Heart,
  MessageCircle,
  Settings,
  UserRoundPlus,
} from "lucide-react";

const items = [
  { to: "/", label: "Discover", Icon: Compass },
  { to: "/explore", label: "Explore", Icon: Compass },
  { to: "/likes", label: "Likes", Icon: Heart },
  { to: "/matches", label: "Friend requests", Icon: UserRoundPlus },
  { to: "/messages", label: "Messages", Icon: MessageCircle },
  { to: "/notifications", label: "Notifications", Icon: Bell },
  { to: "/profile-edit", label: "Settings", Icon: Settings },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <nav
      aria-label="Primary navigation"
      className="safe-area-bottom fixed inset-x-2 bottom-2 z-40 border border-border rounded-2xl bg-card/95 px-1 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-2 shadow-lg backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto flex max-w-lg items-center justify-between gap-0.5">
        {items.map(({ to, label, Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);
          return (
            <Link
              key={to}
              to={to}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              title={label}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-2 text-[9px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-[10px] ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-primary"}`}
            >
              <Icon aria-hidden="true" className="size-5 shrink-0" strokeWidth={active ? 2.5 : 1.8} />
              <span className="max-w-full truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
