import { useEffect, useState } from "react";
import { MatchCard, type MatchPerson } from "./MatchCard";
import { listMyDatingMatches, unmatchDatingProfile } from "@/lib/social/server";

type MatchRow = {
  match_id: string;
  matched_at: string;
  other_user_id: string;
  display_name: string;
  avatar_path: string | null;
  city: string | null;
  region: string | null;
  country_code: string | null;
};

export function MatchGrid() {
  const [matches, setMatches] = useState<MatchPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void listMyDatingMatches()
      .then((result) => {
        if (!active) return;
        if (!result.ok) {
          setError("We could not load your matches. Please try again.");
          setMatches([]);
          return;
        }
        setMatches(
          (result.matches as MatchRow[]).map((match) => ({
            id: match.match_id,
            otherUserId: match.other_user_id,
            name: match.display_name,
            avatarPath: match.avatar_path,
            city: [match.city, match.region, match.country_code].filter(Boolean).join(", "),
            matchedAt: match.matched_at,
          })),
        );
      })
      .catch(() => {
        if (active) {
          setError("We could not load your matches. Please try again.");
          setMatches([]);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const unmatch = async (matchId: string) => {
    setBusyId(matchId);
    setError("");
    try {
      const result = await unmatchDatingProfile({ data: { matchId } });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMatches((current) => current.filter((match) => match.id !== matchId));
    } catch {
      setError("That match could not be removed. Please try again.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <section className="mt-8" aria-labelledby="dating-matches-heading">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8e8e93]">
            Mutual interest
          </p>
          <h2 id="dating-matches-heading" className="mt-1 text-xl font-extrabold text-white">
            Dating matches <span className="text-[#ff4a6e]">{matches.length}</span>
          </h2>
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-2xl border border-white/10 p-4 text-sm text-white/70">
          {error}
        </p>
      )}
      {loading ? (
        <p className="text-sm text-white/55" aria-live="polite">Loading matches…</p>
      ) : matches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-6 text-sm text-white/60">
          No mutual matches yet. When you and another member both like each other, your match will
          appear here.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {matches.map((person) => (
            <MatchCard
              key={person.id}
              person={person}
              busy={busyId === person.id}
              onUnmatch={(matchId) => void unmatch(matchId)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
