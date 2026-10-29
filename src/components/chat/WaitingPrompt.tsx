import { Heart } from "lucide-react";
export function WaitingPrompt({ name = "Jenna" }: { name?: string }) {
  return <div className="mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-white/10 bg-[#1c1c1e] p-4 text-center"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#ff4a6e]/15 text-[#ff4a6e]"><Heart className="size-4 fill-current" /></span><p className="text-xs leading-5 text-white/75"><strong className="text-white">{name} is waiting for a message from you!</strong><br />Start with a friendly hello.</p></div>;
}
