import { Heart, SlidersHorizontal } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function TopBar({ title = "mingleza" }: { title?: string }) {
  return <header className="flex items-center justify-between py-3">
    <Link to="/" className="font-display text-2xl font-extrabold tracking-tight text-white">{title}<span className="text-[#ff4a6e]">.</span></Link>
    <div className="flex items-center gap-2">
      <button type="button" aria-label="Likes" className="grid size-10 place-items-center rounded-full bg-[#1c1c1e] text-white"><Heart className="size-5" /></button>
      <button type="button" aria-label="Discovery filters" className="grid size-10 place-items-center rounded-full bg-[#1c1c1e] text-white"><SlidersHorizontal className="size-5" /></button>
    </div>
  </header>;
}
