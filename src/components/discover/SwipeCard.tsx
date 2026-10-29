import { useRef, useState, type PointerEvent } from "react";
import { MapPin } from "lucide-react";
export type DiscoverProfile = {
  id: string;
  name: string;
  age?: number;
  city: string;
  bio: string;
  photo: string;
  online?: boolean;
  preview?: boolean;
};
export function SwipeCard({
  profile,
  onView,
  onSwipe,
}: {
  profile: DiscoverProfile;
  onView: () => void;
  onSwipe?: (direction: "left" | "right") => void;
}) {
  const startX = useRef<number | null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const pointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    startX.current = event.clientX;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: PointerEvent<HTMLElement>) => {
    if (startX.current !== null)
      setDragX(Math.max(-180, Math.min(180, event.clientX - startX.current)));
  };
  const pointerUp = () => {
    if (startX.current !== null && Math.abs(dragX) > 100) onSwipe?.(dragX > 0 ? "right" : "left");
    startX.current = null;
    setDragging(false);
    setDragX(0);
  };
  return (
    <article
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
      style={{
        transform: `translateX(${dragX}px) rotate(${dragX / 24}deg)`,
        transition: dragging ? "none" : "transform 180ms ease-out",
        touchAction: "pan-y",
      }}
      className={`relative isolate mx-auto h-[min(60dvh,650px)] min-h-[390px] w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-[#1c1c1e] shadow-2xl ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
    >
      {profile.photo ? (
        <img
          src={profile.photo}
          alt={profile.name}
          draggable={false}
          className="pointer-events-none absolute inset-0 -z-20 size-full object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-20 bg-gradient-to-br from-[#3b202a] via-[#1c1c1e] to-[#302b18]"
        />
      )}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-black/25 via-transparent to-black/90" />
      {profile.preview && (
        <span className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
          Fictional preview
        </span>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-black/35 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
          <MapPin className="size-3.5" />
          {profile.city}
        </div>
        <h2 className="font-display text-3xl font-extrabold tracking-tight">
          {profile.name}
          {profile.age ? ", " + profile.age : ""}
          {profile.online && (
            <span className="ml-2 inline-block size-2.5 rounded-full bg-emerald-400 align-middle ring-4 ring-emerald-400/20" />
          )}
        </h2>
        <p className="mt-2 line-clamp-2 max-w-sm text-sm leading-6 text-white/85">{profile.bio}</p>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onView}
          className="pointer-events-auto mt-5 w-full rounded-full bg-white px-5 py-3.5 text-sm font-extrabold text-[#171719] transition hover:bg-[#ffe15a]"
        >
          View Profile
        </button>
      </div>
      {dragging && dragX > 35 && (
        <span className="absolute left-5 top-16 rounded-lg border-2 border-emerald-400 px-3 py-1 text-lg font-black uppercase text-emerald-300">
          Like
        </span>
      )}
      {dragging && dragX < -35 && (
        <span className="absolute right-5 top-16 rounded-lg border-2 border-[#ff4a6e] px-3 py-1 text-lg font-black uppercase text-[#ff4a6e]">
          Pass
        </span>
      )}
    </article>
  );
}
