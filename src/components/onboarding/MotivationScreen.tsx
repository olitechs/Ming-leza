import { ArrowRight, Heart, ShieldCheck, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function MotivationScreen() {
  return <main className="relative flex min-h-dvh items-end overflow-hidden bg-[#0a0a0a] text-white sm:items-center sm:justify-center sm:p-6">
    <div className="absolute inset-0">
      <img src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1400&q=85" alt="Two people sharing a joyful moment outdoors" className="size-full object-cover object-center opacity-75" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/35 to-black/10" />
    </div>
    <section className="relative z-10 mx-auto w-full max-w-lg px-6 pb-[max(env(safe-area-inset-bottom),2rem)] pt-24 sm:rounded-[2rem] sm:bg-black/20 sm:p-10 sm:backdrop-blur-sm">
      <div className="mb-8 flex gap-2" aria-label="Onboarding page 1 of 3"><span className="h-1.5 w-8 rounded-full bg-[#ffe15a]" /><span className="h-1.5 w-5 rounded-full bg-white/35" /><span className="h-1.5 w-5 rounded-full bg-white/35" /></div>
      <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-[#ffe15a] text-[#171719]"><Heart className="size-6 fill-current" /></div>
      <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.25em] text-[#ffe15a]">Real connections, closer to home</p>
      <h1 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">Endless<br />Motivation</h1>
      <p className="mt-4 max-w-sm text-base leading-7 text-white/80">Unlock your true potential by embracing confidence. Meet people across Kenya, one genuine connection at a time.</p>
      <div className="mt-6 flex flex-wrap gap-3 text-xs font-semibold text-white/80"><span className="inline-flex items-center gap-1.5"><Users className="size-4 text-[#ffe15a]" />Friends & dating</span><span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-4 text-[#ffe15a]" />Adults 18+ only</span></div>
      <Link to="/welcome" className="mt-8 flex w-full items-center justify-between rounded-full bg-[#ffe15a] py-2 pl-6 pr-2 text-sm font-extrabold text-[#171719] shadow-xl transition hover:brightness-95">Get started<span className="grid size-11 place-items-center rounded-full bg-[#171719] text-white"><ArrowRight className="size-5" /></span></Link>
      <p className="mt-4 text-center text-xs text-white/55">Made for meaningful connections in Kenya.</p>
    </section>
  </main>;
}
