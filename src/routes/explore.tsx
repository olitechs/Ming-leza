import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowRight, Compass, MapPin, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getMyAccess } from "@/lib/auth/server";

export const Route = createFileRoute("/explore")({
  beforeLoad: async () => {
    const access = await getMyAccess();
    if (!access.authenticated || !access.adultVerified)
      throw redirect({ to: "/login", search: { mode: "signin" } });
  },
  head: () => ({
    meta: [
      { title: "Explore · Mingleza" },
      {
        name: "description",
        content: "Discover people through privacy-conscious, city-based discovery on Mingleza.",
      },
    ],
  }),
  component: Explore,
});

function Explore() {
  return (
    <AppShell>
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">
            Your world, your pace
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Explore</h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Find people open to friendship or dating, starting with the places and preferences you
            choose to share. You stay in control of what appears on your profile.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border bg-card p-6 shadow-soft sm:p-7">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Users aria-hidden="true" className="size-6" />
            </span>
            <h2 className="mt-4 text-xl font-bold">Meet people in your city</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Nearby discovery compares the city on your profile with other eligible members’
              cities. It does not need your GPS coordinates or live location.
            </p>
            <Link
              to="/"
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Open Discover <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </article>

          <article className="rounded-3xl border bg-card p-6 shadow-soft sm:p-7">
            <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
              <MapPin aria-hidden="true" className="size-6" />
            </span>
            <h2 className="mt-4 text-xl font-bold">Choose the place you share</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Keep your city current to make same-city discovery useful. You can update it in your
              profile settings; no street address or exact coordinates are required.
            </p>
            <Link
              to="/profile-edit"
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border bg-background px-5 text-sm font-bold text-foreground transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Edit profile <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </article>
        </div>

        <div className="mt-6 rounded-3xl border bg-secondary/40 p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-card text-primary">
              <ShieldCheck aria-hidden="true" className="size-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold">Discovery with privacy in mind</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                <li className="flex gap-2"><Compass aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary" /> Use For You for broader discovery, or Nearby for members with the same city listed.</li>
                <li className="flex gap-2"><ShieldCheck aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary" /> Discovery is limited to eligible adult-verified members and respects visibility preferences and blocks.</li>
                <li className="flex gap-2"><MapPin aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary" /> No live map pins, GPS tracking, or exact-location display is used here.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
