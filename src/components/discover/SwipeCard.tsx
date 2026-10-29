import { MapPin, Sparkles } from "lucide-react";
export type DiscoverProfile = { id: string; name: string; age: number; city: string; bio: string; photo: string; online?: boolean; match?: number };
export function SwipeCard({ profile, onView }: { profile: DiscoverProfile; onView: () => void }) {
  return <article className="relative isolate mx-auto h-[min(60dvh,650px)] min-h-[390px] w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-[#1c1c1e] shadow-2xl">
    <img src={profile.photo} alt={profile.name} className="absolute inset-0 -z-20 size-full object-cover" />
    <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/25 via-transparent to-black/90" />
    {profile.match && <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full border border-white/20 bg-black/35 px-3 py-2 text-xs font-bold text-white backdrop-blur-md"><Sparkles className="size-3.5 text-[#ffe15a]" />{profile.match}% match</div>}
    <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
      <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-black/35 px-3 py-1.5 text-xs font-semibold backdrop-blur-md"><MapPin className="size-3.5" />{profile.city}</div>
      <h2 className="font-display text-3xl font-extrabold tracking-tight">{profile.name}, {profile.age}{profile.online && <span className="ml-2 inline-block size-2.5 rounded-full bg-emerald-400 align-middle ring-4 ring-emerald-400/20" />}</h2>
      <p className="mt-2 line-clamp-2 max-w-sm text-sm leading-6 text-white/85">{profile.bio}</p>
      <button type="button" onClick={onView} className="mt-5 w-full rounded-full bg-white px-5 py-3.5 text-sm font-extrabold text-[#171719] transition hover:bg-[#ffe15a]">View Profile</button>
    </div>
  </article>;
}
