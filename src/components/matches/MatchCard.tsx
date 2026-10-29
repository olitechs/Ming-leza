import { MapPin, MessageCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
export type MatchPerson = {
  id: string;
  name: string;
  age: number;
  city: string;
  photo: string;
  match: number;
  online?: boolean;
};
export function MatchCard({ person }: { person: MatchPerson }) {
  return (
    <article className="relative isolate aspect-[0.76] overflow-hidden rounded-3xl bg-[#1c1c1e]">
      <img
        src={person.photo}
        alt={person.name}
        className="absolute inset-0 -z-20 size-full object-cover transition duration-500 hover:scale-105"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/30 via-transparent to-black/85" />
      <span className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-[11px] font-extrabold text-white backdrop-blur-md">
        {person.match}% match
      </span>
      <div className="absolute inset-x-0 bottom-0 p-3.5 text-white sm:p-4">
        <h3 className="flex items-center gap-1.5 text-base font-extrabold sm:text-lg">
          {person.name}, {person.age}
          {person.online && <span className="size-2 rounded-full bg-emerald-400" />}
        </h3>
        <p className="mt-1 flex items-center gap-1 text-xs text-white/75">
          <MapPin className="size-3.5" />
          {person.city}
        </p>
        <Link
          to="/messages"
          className="mt-3 flex items-center justify-center gap-2 rounded-full bg-white/15 py-2.5 text-xs font-bold backdrop-blur-md transition hover:bg-[#ff4a6e]"
        >
          <MessageCircle className="size-4" />
          Say hello
        </Link>
      </div>
    </article>
  );
}
