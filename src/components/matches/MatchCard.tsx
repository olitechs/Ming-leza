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
    <article className="relative isolate flex min-h-64 flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#1c1c1e] p-4 text-white">
      <Avatar
        name={person.name}
        avatarPath={person.avatarPath}
        className="mb-4 size-20 bg-white/10 text-2xl text-white"
      />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-extrabold sm:text-lg">{person.name}</h3>
        <p className="mt-1 flex items-center gap-1 text-xs text-white/65">
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
        className="mt-4 flex items-center justify-center rounded-full bg-white/10 py-2.5 text-xs font-bold transition hover:bg-white/15"
      >
        View profile
      </Link>
      <Link
        to="/chat/$matchId"
        params={{ matchId: person.id }}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-[#ff4a6e] py-2.5 text-xs font-bold text-white transition hover:bg-[#f3345b]"
      >
        <MessageCircle className="size-4" />
        Message
      </Link>
      <button
        type="button"
        disabled={busy}
        onClick={() => onUnmatch(person.id)}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 py-2.5 text-xs font-semibold text-white/65 transition hover:border-[#ff4a6e]/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        <UserRoundX className="size-4" />
        {busy ? "Removing…" : "Unmatch"}
      </button>
    </article>
  );
}
