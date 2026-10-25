import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  EyeOff,
  Heart,
  LockKeyhole,
  MapPin,
  Menu,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/brand";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

function SignUpLink({
  label = "Sign up free",
  className,
  onClick,
}: {
  label?: string;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Button
      asChild
      size="lg"
      className={cn(
        "min-h-11 cursor-pointer rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary-pressed",
        className,
      )}
    >
      <a href="/login" onClick={onClick}>
        {label}
        <ArrowRight aria-hidden="true" className="ml-2 size-4" />
      </a>
    </Button>
  );
}

function LoginLink({ className, onClick }: { className?: string; onClick?: () => void }) {
  return (
    <Button
      asChild
      size="lg"
      variant="outline"
      className={cn("min-h-11 cursor-pointer rounded-full px-6", className)}
    >
      <a href="/login?mode=signin" onClick={onClick}>
        Log in
      </a>
    </Button>
  );
}

function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <a
      href="/"
      aria-label="Mingleza home"
      className={cn(
        "inline-flex min-h-11 items-center gap-2.5 rounded-full font-display text-xl font-extrabold tracking-tight",
        light ? "text-primary-foreground" : "text-foreground",
      )}
    >
      <span
        className={cn(
          "grid size-10 place-items-center rounded-full",
          light ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground",
        )}
      >
        <Heart aria-hidden="true" className="size-5 fill-current" />
      </span>
      <span>Mingleza</span>
    </a>
  );
}

function HeaderLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="inline-flex min-h-11 cursor-pointer items-center rounded-full px-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary hover:text-primary-pressed"
    >
      {children}
    </a>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function HeroArtwork() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto flex min-h-[21rem] w-full max-w-xl items-center justify-center overflow-hidden rounded-[2rem] border border-border bg-secondary p-6 shadow-soft sm:min-h-[26rem]"
    >
      <div className="absolute -right-16 -top-16 size-64 rounded-full bg-accent/35 blur-3xl" />
      <div className="absolute -bottom-20 -left-16 size-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute left-10 top-10 size-12 rounded-2xl bg-accent/70 rotate-12" />
      <div className="absolute bottom-12 left-12 size-7 rounded-full bg-primary/45" />
      <div className="relative w-full max-w-sm">
        <div className="absolute -left-3 -top-7 z-10 inline-flex -rotate-6 items-center gap-2 rounded-full border border-border bg-card px-4 py-3 text-sm font-bold text-foreground shadow-soft sm:-left-8">
          <Users className="size-4 text-primary" />
          Friends
        </div>
        <div className="absolute -right-2 -top-5 z-10 inline-flex rotate-6 items-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-bold text-ink shadow-soft sm:-right-7">
          <Heart className="size-4 fill-current" />
          Dating
        </div>
        <div className="rounded-[2rem] border border-border bg-card p-6 shadow-card sm:p-8">
          <div className="flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <Heart className="size-7 fill-current" />
            </span>
            <div>
              <p className="font-display text-lg font-bold text-foreground">Two ways to connect</p>
              <p className="mt-1 text-sm text-muted-foreground">Choose what feels right for you.</p>
            </div>
          </div>
          <div className="mt-7 grid gap-3">
            <div className="flex items-center gap-3 rounded-2xl bg-secondary p-4">
              <span className="grid size-10 place-items-center rounded-full bg-card text-primary">
                <Users className="size-5" />
              </span>
              <div>
                <p className="font-bold text-foreground">Friendship</p>
                <p className="text-xs text-muted-foreground">Start with a friend request</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border p-4">
              <span className="grid size-10 place-items-center rounded-full bg-accent text-ink">
                <Heart className="size-5 fill-current" />
              </span>
              <div>
                <p className="font-bold text-foreground">Dating</p>
                <p className="text-xs text-muted-foreground">Browse dating-enabled profiles</p>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-5 right-2 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-3 text-sm font-bold text-foreground shadow-soft sm:-right-5">
          <MapPin className="size-4 text-primary" />
          Kenya, close to home
        </div>
      </div>
    </div>
  );
}

const trustItems = [
  {
    icon: <ShieldCheck aria-hidden="true" className="size-5" />,
    title: "Adults 18+",
    text: "Age verification is required.",
  },
  {
    icon: <LockKeyhole aria-hidden="true" className="size-5" />,
    title: "Password protected",
    text: "Sign in securely with your email and password.",
  },
  {
    icon: <Heart aria-hidden="true" className="size-5" />,
    title: "Your choice",
    text: "Choose friends or dating.",
  },
  {
    icon: <EyeOff aria-hidden="true" className="size-5" />,
    title: "Hidden until setup",
    text: "New profiles stay undiscoverable until setup is complete.",
  },
];

const steps = [
  {
    number: "01",
    icon: <ShieldCheck aria-hidden="true" className="size-6" />,
    title: "Verify you’re 18+",
    text: "Confirm adulthood before you join. Your date of birth is used for the check and is not stored or shown on your profile.",
  },
  {
    number: "02",
    icon: <Users aria-hidden="true" className="size-6" />,
    title: "Set up your profile",
    text: "Add a display name and the town or city you call home. A profile photo is optional.",
  },
  {
    number: "03",
    icon: <MapPin aria-hidden="true" className="size-6" />,
    title: "Browse by intent",
    text: "Choose Friends or Dating and discover people who have enabled the same way to connect.",
  },
];

const faqs = [
  {
    question: "Is it free?",
    answer:
      "The current Mingleza app has no paid plan or payment screen. We’ll update this answer if that changes.",
  },
  {
    question: "Do I need a password?",
    answer:
      "Yes. Create an account with your email and password. If you forget it, request a password-reset email.",
  },
  {
    question: "Who can join?",
    answer:
      "Mingleza is for adults aged 18 and over. Adult verification is required before you can finish setting up a profile.",
  },
  {
    question: "How do I report someone?",
    answer:
      "In-app reporting and blocking controls are coming soon and are not available yet. A direct support contact has not been published either.",
  },
  {
    question: "Does Mingleza use my location?",
    answer:
      "You add a town or city to your profile. There is no map or distance filter yet; location-based discovery is coming soon.",
  },
  {
    question: "Is my number shown to others?",
    answer:
      "No. Your phone number is used for SMS sign-in and is not included in the public profile details shown to other members.",
  },
];

const cities = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Watamu"];

export function PublicHomepage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only fixed left-3 top-3 z-50 rounded-full bg-card px-5 py-3 font-semibold text-foreground shadow-card focus:not-sr-only focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-16 items-center justify-between gap-3 py-2">
            <Wordmark />
            <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
              <HeaderLink href="#how-it-works">How it works</HeaderLink>
              <HeaderLink href="#safety">Safety</HeaderLink>
              <HeaderLink href="#faq">FAQ</HeaderLink>
            </nav>
            <div className="hidden items-center gap-2 lg:flex">
              <LoginLink />
              <SignUpLink />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="min-h-11 min-w-11 cursor-pointer rounded-full lg:hidden"
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? (
                <X aria-hidden="true" className="size-5" />
              ) : (
                <Menu aria-hidden="true" className="size-5" />
              )}
            </Button>
          </div>
          <nav
            id="mobile-navigation"
            aria-label="Mobile navigation"
            hidden={!menuOpen}
            className="space-y-2 border-t border-border py-4 lg:hidden"
          >
            <HeaderLink href="#how-it-works" onClick={closeMenu}>
              How it works
            </HeaderLink>
            <HeaderLink href="#safety" onClick={closeMenu}>
              Safety
            </HeaderLink>
            <HeaderLink href="#faq" onClick={closeMenu}>
              FAQ
            </HeaderLink>
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <LoginLink onClick={closeMenu} className="w-full sm:w-auto" />
              <SignUpLink onClick={closeMenu} className="w-full sm:w-auto" />
            </div>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section className="relative isolate overflow-hidden" aria-labelledby="hero-title">
          <div
            aria-hidden="true"
            className="absolute -right-24 top-8 size-80 rounded-full bg-accent/15 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute -left-24 bottom-0 size-80 rounded-full bg-primary/10 blur-3xl"
          />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
            <div className="max-w-2xl">
              <p className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-bold text-primary shadow-soft">
                <MapPin aria-hidden="true" className="size-4" />
                Kenya-first. Adults 18+.
              </p>
              <h1
                id="hero-title"
                className="mt-6 max-w-xl font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl"
              >
                Meet your people in Kenya.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                A place to find friendship or dating, with people who are looking for the same kind
                of connection.
              </p>
              <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
                <SignUpLink />
                <LoginLink />
              </div>
              <p className="mt-4 text-sm font-semibold text-foreground">
                18+ only{" "}
                <span className="font-normal text-muted-foreground">· Email and password sign-up</span>
              </p>
            </div>
            <HeroArtwork />
          </div>
        </section>

        <section aria-labelledby="basics-title" className="border-y border-border bg-card">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <h2 id="basics-title" className="sr-only">
              Mingleza basics
            </h2>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {trustItems.map((item) => (
                <li key={item.title} className="flex items-start gap-3 rounded-2xl p-3">
                  <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                    {item.icon}
                  </span>
                  <span>
                    <span className="block font-bold text-foreground">{item.title}</span>
                    <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                      {item.text}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="example-profiles"
          aria-labelledby="example-profiles-title"
          className="border-y border-border bg-card px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <SectionIntro
              eyebrow="Meet Mingleza"
              title="See what a profile can look like"
              description="These four fictional AI demo profiles show the kind of details members can share. They are examples, not real members."
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  name: "Amina",
                  age: 26,
                  city: "Mombasa, Kenya",
                  bio: "Beach walks, Swahili food, and discovering new cafés. Here for kind conversations and genuine friendship.",
                  intents: ["Friends", "Dating"],
                  photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=640&q=80",
                  alt: "Illustrative portrait for fictional AI demo profile Amina",
                },
                {
                  name: "Luca",
                  age: 29,
                  city: "Nairobi, Kenya",
                  bio: "Music lover, weekend hiker, and enthusiastic home cook. I enjoy meeting people with curious minds.",
                  intents: ["Friends", "Dating"],
                  photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=640&q=80",
                  alt: "Illustrative portrait for fictional AI demo profile Luca",
                },
                {
                  name: "Zuri",
                  age: 25,
                  city: "Watamu, Kenya",
                  bio: "Ocean sunsets, books, and slow mornings. Looking to make new friends and share local adventures.",
                  intents: ["Friends"],
                  photo: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=640&q=80",
                  alt: "Illustrative portrait for fictional AI demo profile Zuri",
                },
                {
                  name: "Daniel",
                  age: 31,
                  city: "Malindi, Kenya",
                  bio: "Nature, photography, and road trips up the coast. Always happy to talk about a great place to eat.",
                  intents: ["Friends", "Dating"],
                  photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=640&q=80",
                  alt: "Illustrative portrait for fictional AI demo profile Daniel",
                },
              ].map((person) => (
                <article
                  key={person.name}
                  className="overflow-hidden rounded-3xl border border-border bg-background shadow-soft"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                    <img
                      src={person.photo}
                      alt={person.alt}
                      loading="lazy"
                      className="size-full object-cover"
                    />
                    <span className="absolute left-3 top-3 rounded-full border border-border bg-card/95 px-3 py-1.5 text-xs font-extrabold text-foreground">
                      AI demo · Fictional
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="text-xl font-extrabold">{person.name}, {person.age}</h3>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin aria-hidden="true" className="size-4 shrink-0" />
                      {person.city}
                    </p>
                    <p className="mt-3 min-h-24 text-sm leading-6 text-muted-foreground">
                      {person.bio}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {person.intents.map((intent) => (
                        <span
                          key={intent}
                          className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground"
                        >
                          {intent}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <p className="mx-auto mt-6 max-w-3xl text-center text-sm leading-6 text-muted-foreground">
              Photos are illustrative stock portraits. Demo profiles do not have real accounts,
              live status, or private conversations. Real member profiles appear in Discover after
              members complete setup and choose to be discoverable.
            </p>
            <div className="mt-7 flex justify-center">
              <SignUpLink label="Create your profile" />
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          aria-labelledby="how-title"
          className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <SectionIntro
              eyebrow="How it works"
              title="A simple way to get started"
              description="Start with the essentials, then choose how you want to connect."
            />
            <ol className="grid gap-4 md:grid-cols-3">
              {steps.map((step) => (
                <li
                  key={step.number}
                  className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
                      {step.icon}
                    </span>
                    <span className="font-display text-sm font-extrabold tracking-widest text-primary">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-foreground">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          aria-labelledby="intents-title"
          className="bg-secondary/60 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <SectionIntro
              eyebrow="Choose your kind of connection"
              title="Friends or dating"
              description="Set the intent that feels right. Mingleza shows profiles that have enabled the same way to connect."
            />
            <div className="grid gap-5 md:grid-cols-2">
              <article className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
                <span className="grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
                  <Users aria-hidden="true" className="size-7" />
                </span>
                <h3 className="mt-5 font-display text-2xl font-bold">Here for friendship</h3>
                <p className="mt-3 leading-7 text-muted-foreground">
                  Find people open to making friends. Friend requests and messaging are available
                  after a request is accepted.
                </p>
                <p className="mt-5 inline-flex min-h-11 items-center rounded-full bg-secondary px-4 text-sm font-bold text-primary">
                  Friend requests and chat are live
                </p>
              </article>
              <article className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
                <span className="grid size-14 place-items-center rounded-2xl bg-accent text-ink">
                  <Heart aria-hidden="true" className="size-7 fill-current" />
                </span>
                <h3 className="mt-5 font-display text-2xl font-bold">Open to dating</h3>
                <p className="mt-3 leading-7 text-muted-foreground">
                  Browse people who have chosen dating as an intent. Dating likes and matching are
                  not available yet.
                </p>
                <p className="mt-5 inline-flex min-h-11 items-center rounded-full bg-accent/20 px-4 text-sm font-bold text-ink">
                  Likes and matches coming soon
                </p>
              </article>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="kenya-title"
          className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        >
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">
                From coast to city
              </p>
              <h2
                id="kenya-title"
                className="mt-3 font-display text-3xl font-extrabold sm:text-4xl"
              >
                Meet people across Kenya
              </h2>
              <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
                Mingleza is built with Kenya in mind. Add your town or city to your profile. Map and
                distance-based discovery are coming soon; today, profiles are discovered by the
                intent you choose.
              </p>
            </div>
            <div
              role="group"
              aria-label="Illustration with example cities in Kenya"
              className="relative mx-auto flex min-h-[18rem] w-full max-w-xl items-center justify-center overflow-hidden rounded-[2rem] border border-border bg-secondary p-8"
            >
              <div className="absolute -right-12 -top-16 size-56 rounded-full bg-accent/35" />
              <div className="absolute -bottom-20 -left-12 size-64 rounded-full bg-primary/15" />
              <ul
                aria-label="Example cities"
                className="relative grid w-full max-w-sm grid-cols-3 gap-3"
              >
                {cities.map((city, index) => (
                  <li
                    key={city}
                    className={cn(
                      "flex min-h-14 items-center justify-center gap-1.5 rounded-2xl border border-border bg-card px-2 text-center text-xs font-bold text-foreground shadow-soft sm:text-sm",
                      index % 2 === 1 && "translate-y-5",
                    )}
                  >
                    <MapPin aria-hidden="true" className="size-3.5 shrink-0 text-primary" />
                    {city}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section
          id="safety"
          aria-labelledby="safety-title"
          className="scroll-mt-24 bg-card px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        >
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">
                Safety and privacy
              </p>
              <h2
                id="safety-title"
                className="mt-3 font-display text-3xl font-extrabold sm:text-4xl"
              >
                Start with the important basics
              </h2>
              <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
                We keep the sign-up focused on adult access and clear profile choices. Some controls
                are still being built, and we say so plainly.
              </p>
              <SignUpLink className="mt-7" />
            </div>
            <div className="grid gap-4">
              <article className="flex gap-4 rounded-3xl border border-border bg-background p-5 sm:p-6">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
                  <ShieldCheck aria-hidden="true" className="size-6" />
                </span>
                <div>
                  <h3 className="font-bold">Adults 18+ only</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Adult verification is required. Your birth date is not stored or displayed on
                    your profile.
                  </p>
                </div>
              </article>
              <article className="flex gap-4 rounded-3xl border border-border bg-background p-5 sm:p-6">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
                  <EyeOff aria-hidden="true" className="size-6" />
                </span>
                <div>
                  <h3 className="font-bold">Discoverability starts off</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    A new profile stays hidden until setup is complete. Ongoing visibility controls
                    are coming soon.
                  </p>
                </div>
              </article>
              <article className="flex gap-4 rounded-3xl border border-border bg-background p-5 sm:p-6">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-ink">
                  <LockKeyhole aria-hidden="true" className="size-6" />
                </span>
                <div>
                  <h3 className="font-bold">Report and block</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    In-app reporting and blocking are not available yet. These controls are coming
                    soon.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section
          id="faq"
          aria-labelledby="faq-title"
          className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        >
          <div className="mx-auto max-w-3xl">
            <SectionIntro
              eyebrow="FAQ"
              title="A few things to know"
              description="Short answers about joining and the features available today."
            />
            <Accordion
              type="single"
              collapsible
              className="rounded-3xl border border-border bg-card px-5 shadow-soft sm:px-7"
            >
              {faqs.map((faq, index) => (
                <AccordionItem key={faq.question} value={`faq-${index}`}>
                  <AccordionTrigger className="min-h-14 py-4 text-left text-base font-bold text-foreground hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-sm leading-6 text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <a
              href="/faq"
              className="mt-5 inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold text-primary underline underline-offset-4 hover:text-primary-pressed"
            >
              Read all frequently asked questions
            </a>
          </div>
        </section>

        <section aria-labelledby="final-cta-title" className="px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-primary px-6 py-12 text-center text-primary-foreground sm:px-12 sm:py-16">
            <div
              aria-hidden="true"
              className="absolute -right-16 -top-24 size-64 rounded-full bg-accent/35 blur-2xl"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-28 -left-16 size-72 rounded-full bg-primary-foreground/10 blur-2xl"
            />
            <div className="relative mx-auto max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary-foreground">
                Your next connection starts here
              </p>
              <h2
                id="final-cta-title"
                className="mt-3 font-display text-3xl font-extrabold sm:text-4xl"
              >
                Take the first step.
              </h2>
              <p className="mt-3 leading-7 text-primary-foreground">
                Create your profile, choose your intent, and meet people across Kenya. Adults 18+
                only.
              </p>
              <SignUpLink
                label="Create your free account"
                className="mt-7 bg-accent text-ink hover:bg-accent/90"
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
          <div>
            <Wordmark />
            <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
              A Kenya-first place to find friendship or dating. For adults 18+.
            </p>
          </div>
          <nav aria-label="Footer links" className="grid content-start gap-3">
            <h2 className="text-sm font-bold text-foreground">Explore</h2>
            <a
              className="inline-flex min-h-11 cursor-pointer items-center text-sm text-muted-foreground hover:text-primary hover:underline"
              href="/faq"
            >
              FAQ and help
            </a>
            <a
              className="inline-flex min-h-11 cursor-pointer items-center text-sm text-muted-foreground hover:text-primary hover:underline"
              href="/terms"
            >
              Terms
            </a>
            <a
              className="inline-flex min-h-11 cursor-pointer items-center text-sm text-muted-foreground hover:text-primary hover:underline"
              href="/privacy"
            >
              Privacy
            </a>
            <a
              className="inline-flex min-h-11 cursor-pointer items-center text-sm text-muted-foreground hover:text-primary hover:underline"
              href="#safety"
            >
              Safety tips
            </a>
          </nav>
          <section id="contact" aria-labelledby="contact-title" className="scroll-mt-24">
            <h2 id="contact-title" className="text-sm font-bold text-foreground">
              Contact
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Support contact details are coming soon.
            </p>
            <p className="mt-5 text-sm font-bold text-foreground">18+ only</p>
          </section>
        </div>
        <div className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Mingleza
        </div>
      </footer>
    </div>
  );
}
