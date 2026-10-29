import { MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { DiscoverProfile } from "./SwipeCard";

export function ViewProfileSheet({ profile, open, onOpenChange }: { profile: DiscoverProfile; open: boolean; onOpenChange: (open: boolean) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[85dvh] overflow-y-auto border-white/10 bg-[#1c1c1e] text-white sm:max-w-md"><div className="relative -mx-6 -mt-6 mb-2 h-64 overflow-hidden"><img src={profile.photo} alt={profile.name} className="size-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-[#1c1c1e] to-transparent" /></div><DialogHeader><DialogTitle className="font-display text-2xl">{profile.name}, {profile.age}</DialogTitle><DialogDescription className="flex items-center gap-1.5 text-[#8e8e93]"><MapPin className="size-4" />{profile.city}</DialogDescription></DialogHeader><p className="text-sm leading-6 text-white/80">{profile.bio}</p><div className="rounded-2xl bg-white/5 p-3 text-xs leading-5 text-white/60">Profiles and connections are subject to Mingleza's age-verification and community safety rules.</div></DialogContent></Dialog>;
}
