import { Link } from "@tanstack/react-router";
const likes = [
  { name: "Anna", photo: "photo-1534528741775-53994a69daeb" },
  { name: "Debbie", photo: "photo-1524504388940-b1c1722653e1" },
  { name: "Nicole", photo: "photo-1531123897727-8f129e1688ce" },
  { name: "Wanjiku", photo: "photo-1534751516642-a1af1ef26a56" },
  { name: "Aisha", photo: "photo-1517841905240-472988babdf9" },
  { name: "Zuri", photo: "photo-1529139574466-a303027c1d8b" },
];
export function LikesRail() {
  return <section aria-labelledby="likes-heading" className="mt-6">
    <div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8e8e93]">People who noticed you</p><h2 id="likes-heading" className="mt-1 text-xl font-extrabold text-white">Likes <span className="text-[#ff4a6e]">28</span></h2></div><span className="text-xs font-semibold text-[#8e8e93]">See all</span></div>
    <div className="flex gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{likes.map((person) => <Link key={person.name} to="/" aria-label={`Discover ${person.name}`} className="flex shrink-0 flex-col items-center gap-2">
      <span className="relative block size-[4.25rem] rounded-full bg-gradient-to-br from-[#ff4a6e] to-[#ffe15a] p-[2px]"><img src={`https://images.unsplash.com/${person.photo}?auto=format&fit=crop&w=180&q=80`} alt="" className="size-full rounded-full border-2 border-[#111113] object-cover" /><span className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-[#111113] bg-emerald-400" /></span><span className="text-xs font-semibold text-white/90">{person.name}</span>
    </Link>)}</div>
  </section>;
}
