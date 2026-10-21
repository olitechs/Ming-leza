import { Link } from "@tanstack/react-router";
import {
  Flame,
  Map,
  MessageCircle,
  Heart,
  User,
  Bell,
  Crown,
  Settings,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { signOutAndLeave } from "@/lib/auth/sign-out";

type NavItem = {
  to: "/" | "/explore" | "/matches" | "/messages" | "/u/$id" | "/profile-edit";
  label: string;
  icon: LucideIcon;
};
const main: NavItem[] = [
  { to: "/", label: "Discover", icon: Flame },
  { to: "/explore", label: "Explore", icon: Map },
  { to: "/matches", label: "Matches", icon: Heart },
  { to: "/messages", label: "Messages", icon: MessageCircle },
];
const soon: { label: string; icon: LucideIcon }[] = [
  { label: "Notifications", icon: Bell },
  { label: "Premium", icon: Crown },
  { label: "Settings", icon: Settings },
];

export function AppShell({
  children,
  aside,
  hideTabs,
}: {
  children: ReactNode;
  aside?: ReactNode;
  hideTabs?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background lg:flex">
      <nav className="hidden lg:flex sticky top-0 h-screen w-[72px] flex-col items-center gap-2 border-r bg-sidebar py-5">
        <Link
          to="/"
          aria-label="Mingleza home"
          className="mb-4 grid size-11 place-items-center rounded-2xl bg-brand font-display text-lg font-extrabold text-primary-foreground"
        >
          M
        </Link>
        {main.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            title={label}
            activeOptions={{ exact: true }}
            className="grid size-11 place-items-center rounded-2xl text-muted-foreground transition hover:bg-secondary hover:text-secondary-foreground"
            activeProps={{ className: "!bg-primary !text-primary-foreground" }}
          >
            <Icon className="size-5" />
          </Link>
        ))}
        <Link
          to="/profile-edit"
          title="Edit profile"
          className="grid size-11 place-items-center rounded-2xl text-muted-foreground hover:bg-secondary"
        >
          <User className="size-5" />
        </Link>
        <div className="mt-auto flex flex-col gap-2">
          {soon.map(({ label, icon: Icon }) => (
            <span
              key={label}
              title={`${label} (coming soon)`}
              className="grid size-11 place-items-center rounded-2xl text-muted-foreground/50"
            >
              <Icon className="size-5" />
            </span>
          ))}
          <button
            type="button"
            aria-label="Sign out"
            title="Sign out"
            onClick={() => void signOutAndLeave()}
            className="grid size-11 cursor-pointer place-items-center rounded-2xl text-muted-foreground transition hover:bg-secondary hover:text-secondary-foreground"
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </nav>

      <main className="min-w-0 flex-1 pb-28 lg:pb-0">{children}</main>
      {aside && (
        <aside className="hidden xl:block sticky top-0 h-screen w-[360px] overflow-y-auto border-l bg-card">
          {aside}
        </aside>
      )}

      {!hideTabs && (
        <nav className="fixed inset-x-4 bottom-4 z-20 mx-auto flex max-w-sm items-center justify-between rounded-full bg-ink p-2 shadow-card lg:hidden">
          {main.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              aria-label={label}
              activeOptions={{ exact: true }}
              className="grid size-12 place-items-center rounded-full text-ink-foreground/60 transition"
              activeProps={{ className: "!bg-primary !text-primary-foreground" }}
            >
              <Icon className="size-5" />
            </Link>
          ))}
          <Link
            to="/profile-edit"
            aria-label="Edit profile"
            className="grid size-12 place-items-center rounded-full text-ink-foreground/60"
            activeProps={{ className: "!bg-primary !text-primary-foreground" }}
          >
            <User className="size-5" />
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
  const cls = `rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`;
  return onClick ? (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  ) : (
    <span className={cls}>{children}</span>
  );
}
