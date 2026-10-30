import { Link, useRouterState } from "@tanstack/react-router";
import { Compass, Heart, MessageCircle, Settings } from "lucide-react";

const items = [
  { to: "/", label: "Discover", Icon: Compass },
  { to: "/matches", label: "Likes", Icon: Heart },
  { to: "/messages", label: "Chat", Icon: MessageCircle },
  { to: "/profile-edit", label: "Settings", Icon: Settings },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {items.map(({ to, label, Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-14 flex-col items-center gap-1 text-[11px] font-semibold transition focus-visible:rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "text-primary" : "text-muted-foreground"}`}
            >
              <Icon aria-hidden="true" className="size-5" strokeWidth={active ? 2.5 : 1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
