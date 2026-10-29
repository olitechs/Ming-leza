import { Link } from "@tanstack/react-router";
import { MapPin, MessageCircle, UserRoundX } from "lucide-react";
import { Avatar } from "@/components/Avatar";

export type MatchPerson = {
  id: string;
  otherUserId: string;
  name: string;
  avatarPath: string | null;
  city: string;
  matchedAt: string;
};

export function MatchCard({
  person,
  busy,
  onUnmatch,
}: {
  person: MatchPerson;
  busy: boolean;
  onUnmatch: (matchId: string) => void;
}) {
  return (
    <article className="relative isolate flex min-h-64 flex-col overflow-hidden rounded-3xl border border-border bg-card p-4 text-card-foreground">
      <Avatar
        name={person.name}
        avatarPath={person.avatarPath}
        className="mb-4 size-20 bg-muted text-2xl text-card-foreground"
      />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-extrabold sm:text-lg">{person.name}</h3>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">{person.city || "Mingleza member"}</span>
        </p>
        <p className="mt-2 text-xs text-white/45">
          Matched {new Date(person.matchedAt).toLocaleDateString()}
        </p>
      </div>
      <Link
        to="/u/$id"
        params={{ id: person.otherUserId }}
        className="mt-4 flex items-center justify-center rounded-full border border-border bg-secondary py-2.5 text-xs font-bold text-secondary-foreground transition hover:bg-muted"
      >
        View profile
      </Link>
      <Link
        to="/chat/$matchId"
        params={{ matchId: person.id }}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
      >
        <MessageCircle className="size-4" />
        Message
      </Link>
      <button
        type="button"
        disabled={busy}
        onClick={() => onUnmatch(person.id)}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 py-2.5 text-xs font-semibold text-muted-foreground transition hover:border-[#ff4a6e]/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        <UserRoundX className="size-4" />
        {busy ? "Removing…" : "Unmatch"}
      </button>
    </article>
  );
}
