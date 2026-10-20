import { Link } from "@tanstack/react-router";
import { Home, Flame, Map, MessageCircle, User, Bell, Crown, Settings, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type NavItem = { to: string; label: string; icon: LucideIcon };
const main: NavItem[] = [
  { to: "/", label: "Discover", icon: Flame },
  { to: "/matches", label: "Matches", icon: Home },
  { to: "/messages", label: "Messages", icon: MessageCircle },
];
const soon: { label: string; icon: LucideIcon }[] = [
  { label: "Explore", icon: Map },
  { label: "Notifications", icon: Bell },
  { label: "Premium", icon: Crown },
  { label: "Settings", icon: Settings },
  { label: "Profile", icon: User },
];

export function AppShell({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="min-h-screen bg-background lg:flex">
      <nav className="hidden lg:flex sticky top-0 h-screen w-[72px] flex-col items-center gap-2 border-r bg-sidebar py-5">
        <Link to="/" className="mb-4 grid size-11 place-items-center rounded-2xl bg-brand font-display text-lg font-extrabold text-primary-foreground">M</Link>
        {main.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} title={label} activeOptions={{ exact: true }}
            className="grid size-11 place-items-center rounded-2xl text-muted-foreground transition hover:bg-secondary hover:text-secondary-foreground"
            activeProps={{ className: "!bg-secondary !text-primary" }}>
            <Icon className="size-5" />
          </Link>
        ))}
        <div className="mt-auto flex flex-col gap-2">
          {soon.slice(1).map(({ label, icon: Icon }) => (
            <span key={label} title={`${label} (coming soon)`} className="grid size-11 place-items-center rounded-2xl text-muted-foreground/50"><Icon className="size-5" /></span>
          ))}
        </div>
      </nav>

      <main className="flex-1 pb-24 lg:pb-0">{children}</main>
      {aside && <aside className="hidden xl:block sticky top-0 h-screen w-[360px] overflow-y-auto border-l bg-card">{aside}</aside>}

      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t bg-card/95 py-2 backdrop-blur lg:hidden">
        {main.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} activeOptions={{ exact: true }} className="flex flex-col items-center gap-0.5 px-4 py-1 text-xs font-medium text-muted-foreground" activeProps={{ className: "!text-primary" }}>
            <Icon className="size-5" />{label}
          </Link>
        ))}
        <span className="flex flex-col items-center gap-0.5 px-4 py-1 text-xs font-medium text-muted-foreground/50"><Map className="size-5" />Explore</span>
      </nav>
    </div>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">{children}</span>;
}
