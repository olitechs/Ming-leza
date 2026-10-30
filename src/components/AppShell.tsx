import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  Flame,
  Map,
  MessageCircle,
  UserPlus,
  User,
  Bell,
  Crown,
  Settings,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { signOutAndLeave } from "@/lib/auth/sign-out";
import { listMyNotifications } from "@/lib/social/server";

type NavItem = {
  to: "/" | "/explore" | "/matches" | "/messages" | "/notifications" | "/u/$id" | "/profile-edit";
  label: string;
  icon: LucideIcon;
  badge?: number;
};
const main: NavItem[] = [
  { to: "/", label: "Discover", icon: Flame },
  { to: "/explore", label: "Explore", icon: Map },
  { to: "/matches", label: "Friend requests", icon: UserPlus },
  { to: "/messages", label: "Messages", icon: MessageCircle },
  { to: "/notifications", label: "Notifications", icon: Bell },
];
const soon: { label: string; icon: LucideIcon }[] = [{ label: "Premium", icon: Crown }];

export function AppShell({
  children,
  aside,
  hideTabs,
}: {
  children: ReactNode;
  aside?: ReactNode;
  hideTabs?: boolean;
}) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const result = await listMyNotifications();
      if (result.ok) {
        setUnreadCount(
          result.notifications.filter((notification) => !notification.read_at).length,
        );
      }
    } catch {
      // Keep navigation usable if the notification service is temporarily unavailable.
    }
  }, []);

  useEffect(() => {
    void refreshUnreadCount();
    window.addEventListener("focus", refreshUnreadCount);
    return () => window.removeEventListener("focus", refreshUnreadCount);
  }, [refreshUnreadCount]);

  const navItems = main.map((item) =>
    item.to === "/notifications" ? { ...item, badge: unreadCount } : item,
  );

  return (
    <div className="min-h-dvh bg-background lg:flex">
      <nav
        aria-label="Primary navigation"
        className="sticky top-0 hidden h-dvh w-[72px] flex-col items-center gap-2 border-r bg-sidebar py-5 lg:flex"
      >
        <Link
          to="/"
          aria-label="Mingleza home"
          className="mb-4 grid size-11 place-items-center rounded-2xl bg-brand font-display text-lg font-extrabold text-primary-foreground"
        >
          M
        </Link>
        {navItems.map(({ to, label, icon: Icon, badge }) => (
          <Link
            key={to}
            to={to}
            title={label}
            aria-label={badge && badge > 0 ? `${label}, ${badge} unread` : label}
            activeOptions={{ exact: true }}
            className="relative grid size-11 place-items-center rounded-2xl text-muted-foreground transition hover:bg-secondary hover:text-secondary-foreground"
            activeProps={{ className: "!bg-primary !text-primary-foreground" }}
          >
            <Icon aria-hidden="true" className="size-5" />
            {badge !== undefined && badge > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground"
              >
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </Link>
        ))}
        <Link
          to="/profile-edit"
          title="Settings and profile"
          aria-label="Settings and profile"
          activeOptions={{ exact: true }}
          className="grid size-11 place-items-center rounded-2xl text-muted-foreground transition hover:bg-secondary hover:text-secondary-foreground"
          activeProps={{ className: "!bg-primary !text-primary-foreground" }}
        >
          <Settings aria-hidden="true" className="size-5" />
        </Link>
        <div className="mt-auto flex flex-col gap-2">
          {soon.map(({ label, icon: Icon }) => (
            <span
              key={label}
              title={`${label} (coming soon)`}
              className="grid size-11 place-items-center rounded-2xl text-muted-foreground/50"
            >
              <Icon aria-hidden="true" className="size-5" />
            </span>
          ))}
          <button
            type="button"
            aria-label="Sign out"
            title="Sign out"
            onClick={() => void signOutAndLeave()}
            className="grid size-11 cursor-pointer place-items-center rounded-2xl text-muted-foreground transition hover:bg-secondary hover:text-secondary-foreground"
          >
            <LogOut aria-hidden="true" className="size-5" />
          </button>
        </div>
      </nav>

      <main className="min-w-0 flex-1 pb-28 lg:pb-0">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-end gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6 lg:px-8">
          <Link
            to="/notifications"
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
            title={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
            activeOptions={{ exact: true }}
            className="relative inline-flex size-10 items-center justify-center rounded-full border bg-card text-foreground transition hover:bg-secondary"
            activeProps={{ className: "!border-primary !text-primary" }}
          >
            <Bell aria-hidden="true" className="size-5" />
            {unreadCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
          <Link
            to="/profile-edit"
            aria-label="Settings and profile"
            title="Settings and profile"
            activeOptions={{ exact: true }}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border bg-card px-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
            activeProps={{ className: "!border-primary !text-primary" }}
          >
            <Settings aria-hidden="true" className="size-4" />
            <span>Settings</span>
          </Link>
        </header>
        {children}
      </main>
      {aside && (
        <aside className="sticky top-0 hidden h-dvh w-[360px] overflow-y-auto border-l bg-card">
          {aside}
        </aside>
      )}

      {!hideTabs && (
        <nav
          aria-label="Mobile navigation"
          className="safe-area-bottom fixed inset-x-4 bottom-0 z-20 mx-auto flex max-w-sm items-center justify-between rounded-full bg-ink p-2 shadow-card lg:hidden"
        >
          {navItems.map(({ to, label, icon: Icon, badge }) => (
            <Link
              key={to}
              to={to}
              aria-label={badge && badge > 0 ? `${label}, ${badge} unread` : label}
              title={label}
              activeOptions={{ exact: true }}
              className="relative grid size-12 place-items-center rounded-full text-ink-foreground/60 transition"
              activeProps={{ className: "!bg-primary !text-primary-foreground" }}
            >
              <Icon aria-hidden="true" className="size-5" />
              {badge !== undefined && badge > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground"
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          ))}
          <Link
            to="/profile-edit"
            aria-label="Settings and profile"
            title="Settings and profile"
            className="grid size-12 place-items-center rounded-full text-ink-foreground/60"
            activeProps={{ className: "!bg-primary !text-primary-foreground" }}
          >
            <Settings aria-hidden="true" className="size-5" />
          </Link>
        </nav>
      )}
    </div>
  );
}

export function Chip({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  const cls = `min-h-11 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`;
  return onClick ? (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  ) : (
    <span className={cls}>{children}</span>
  );
}
