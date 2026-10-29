import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Avatar } from "@/components/Avatar";
import { listIncomingDatingLikes } from "@/lib/social/server";

type IncomingLike = {
  liker_id: string;
  liked_at: string;
  display_name: string;
  avatar_path: string | null;
  city: string | null;
  region: string | null;
  country_code: string | null;
};

export function LikesRail() {
  const [likes, setLikes] = useState<IncomingLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void listIncomingDatingLikes()
      .then((result) => {
        if (!active) return;
        if (!result.ok) {
          setError("We could not load your incoming likes. Please try again.");
          setLikes([]);
          return;
        }
        setLikes(result.likes as IncomingLike[]);
      })
      .catch(() => {
        if (active) setError("We could not load your incoming likes. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section aria-labelledby="likes-heading" className="mt-6">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8e8e93]">
            People who noticed you
          </p>
          <h2 id="likes-heading" className="mt-1 text-xl font-extrabold text-white">
            Likes <span className="text-[#ff4a6e]">{likes.length}</span>
          </h2>
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-2xl border border-white/10 p-4 text-sm text-white/70">
          {error}
        </p>
      ) : loading ? (
        <p className="text-sm text-white/55" aria-live="polite">Loading likes…</p>
      ) : likes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 p-5 text-sm text-white/60">
          No new likes yet. When another dating member likes your profile, you’ll see them here.
        </p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {likes.map((person) => {
            const location = [person.city, person.region, person.country_code]
              .filter(Boolean)
              .join(", ");
            return (
              <Link
                key={person.liker_id}
                to="/u/$id"
                params={{ id: person.liker_id }}
                aria-label={`View profile of ${person.display_name}, who liked you`}
                className="flex shrink-0 flex-col items-center gap-2"
              >
                <span className="relative block size-[4.25rem] rounded-full bg-gradient-to-br from-[#ff4a6e] to-[#ffe15a] p-[2px]">
                  <Avatar
                    name={person.display_name}
                    avatarPath={person.avatar_path}
                    className="size-full border-2 border-[#111113] bg-[#1c1c1e] text-sm text-white"
                  />
                  <span className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-[#111113] bg-[#ff4a6e]" />
                </span>
                <span className="max-w-20 truncate text-xs font-semibold text-white/90">
                  {person.display_name}
                </span>
                <span className="max-w-24 truncate text-[10px] text-white/45">
                  {location || "Mingleza member"}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
