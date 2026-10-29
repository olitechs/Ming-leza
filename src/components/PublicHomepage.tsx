import { useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Heart,
  MapPin,
  Menu,
  MessageCircle,
  ShieldCheck,
  Sparkles,
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
  label = "Join Mingleza",
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
        "min-h-12 cursor-pointer rounded-full bg-accent px-6 font-extrabold text-ink hover:bg-accent/90",
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
      className={cn(
        "min-h-12 cursor-pointer rounded-full border-white/20 bg-white/[0.04] px-6 text-white hover:bg-white/10",
        className,
      )}
    >
      <a href="/login?mode=signin" onClick={onClick}>
        Sign in
      </a>
    </Button>
  );
}

function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href="/"
      aria-label="Mingleza home"
      className="inline-flex min-h-11 items-center gap-2.5 rounded-full font-display text-xl font-extrabold tracking-tight text-white"
    >
      <span className="grid size-10 place-items-center rounded-full bg-accent text-ink">
        <Heart aria-hidden="true" className="size-5 fill-current" />
      </span>
      {!compact && <span>Mingleza</span>}
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
      className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-white/75 transition-colors hover:bg-white/[0.07] hover:text-white"
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
      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-accent">{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/60 sm:text-lg">
        {description}
      </p>
    </div>
  );
}

const faqs = [
  {
    question: "Who can join Mingleza?",
    answer:
      "Mingleza is for adults aged 18 and over. You must complete the adult verification step before finishing your profile setup.",
  },
  {
    question: "Is Mingleza free?",
    answer:
      "The current app has no paid membership plan or payment screen. You can create an account using the available sign-up flow.",
  },
  {
    question: "Can I choose friendship instead of dating?",
    answer:
      "Yes. Your profile can enable friendship, dating, or both where those options are available. Discover uses the connection intent people have enabled.",
  },
  {
    question: "Which cities are supported?",
    answer:
      "You can add your town or city to your profile, including places such as Nairobi, Mombasa, Kisumu, Nakuru, Eldoret, and Watamu. Distance-based discovery is not available yet.",
  },
  {
    question: "How do I report or block a member?",
    answer:
      "Reporting and blocking options are available from Discover and member profiles. Reports are recorded for moderator review. If you are in immediate danger, contact local emergency services.",
  },
  {
    question: "Are likes, matches, and premium boosts available?",
    answer:
      "Friendship requests are available. Dating likes and passes can be saved, but mutual matches, match percentages, and paid boosts are not available yet.",
  },
];

const cities = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Watamu"];

const previewProfiles = [
  {
    name: "Amina",
    age: 26,
    city: "Mombasa",
    intent: "Friendship & dating",
    photo:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=720&q=85",
    position: "object-[center_35%]",
  },
  {
    name: "Zuri",
    age: 25,
    city: "Watamu",
    intent: "Friendship",
    photo:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=720&q=85",
    position: "object-[center_30%]",
  },
];

export function PublicHomepage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-dvh overflow-hidden bg-[#0a0a0b] text-white">
      <a
        href="#main-content"
        className="sr-only fixed left-3 top-3 z-50 rounded-full bg-white px-5 py-3 font-semibold text-black focus:not-sr-only focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#0a0a0b]/90 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-[76px] items-center justify-between gap-4">
            <Wordmark />
            <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
              <HeaderLink href="#how-it-works">How it works</HeaderLink>
              <HeaderLink href="#discover">Discover</HeaderLink>
              <HeaderLink href="#safety">Safety</HeaderLink>
              <HeaderLink href="#faq">FAQ</HeaderLink>
            </nav>
            <div className="hidden items-center gap-2 sm:flex">
              <LoginLink />
              <SignUpLink />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="min-h-11 min-w-11 rounded-full border-white/15 bg-white/[0.04] text-white sm:hidden"
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
            className="space-y-2 border-t border-white/10 py-4 sm:hidden"
          >
            <HeaderLink href="#how-it-works" onClick={closeMenu}>
              How it works
            </HeaderLink>
            <HeaderLink href="#discover" onClick={closeMenu}>
              Discover
            </HeaderLink>
            <HeaderLink href="#safety" onClick={closeMenu}>
              Safety
            </HeaderLink>
            <HeaderLink href="#faq" onClick={closeMenu}>
              FAQ
            </HeaderLink>
            <div className="flex gap-2 pt-2">
              <LoginLink onClick={closeMenu} className="flex-1" />
              <SignUpLink onClick={closeMenu} className="flex-1" />
            </div>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section aria-labelledby="hero-title" className="relative isolate">
          <div
            aria-hidden="true"
            className="absolute -right-32 top-8 size-[28rem] rounded-full bg-[#ff4a6e]/15 blur-[100px]"
          />
          <div
            aria-hidden="true"
            className="absolute -left-32 bottom-0 size-[26rem] rounded-full bg-[#ffe15a]/10 blur-[100px]"
          />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#ffe15a]/25 bg-[#ffe15a]/[0.08] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.15em] text-[#ffe15a]">
                <span className="grid size-6 place-items-center rounded-full bg-[#ffe15a] text-[10px] text-black">
                  18+
                </span>
                Kenya’s adults-only social app
              </div>
              <h1
                id="hero-title"
                className="mt-7 font-display text-5xl font-extrabold leading-[1.02] tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl"
              >
                Real people.
                <span className="mt-1 block text-[#ffe15a]">Meaningful</span>
                <span className="block">connections.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-white/65 sm:text-lg sm:leading-8">
                Meet singles and make new friends across Nairobi, Mombasa, Kisumu, and beyond.
                Choose the connection you want—on your terms.
              </p>
              <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
                <SignUpLink />
                <LoginLink />
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/55">
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="size-4 text-[#ffe15a]" aria-hidden="true" /> Adults 18+
                  only
                </span>
                <span className="inline-flex items-center gap-2">
                  <MapPin className="size-4 text-[#ffe15a]" aria-hidden="true" /> Made with Kenya in
                  mind
                </span>
              </div>
              <a
                href="#how-it-works"
                className="mt-8 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-white/70 hover:text-white"
              >
                See how it works <ArrowDown aria-hidden="true" className="size-4" />
              </a>
            </div>

            <div
              className="relative mx-auto flex min-h-[440px] w-full max-w-[540px] items-center justify-center sm:min-h-[550px]"
              aria-label="Illustrative Mingleza profile preview"
            >
              <div
                aria-hidden="true"
                className="absolute left-1/2 top-1/2 size-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.07] sm:size-[470px]"
              />
              <div
                aria-hidden="true"
                className="absolute left-1/2 top-1/2 size-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.07] sm:size-[370px]"
              />
              <div className="absolute left-0 top-10 z-20 hidden w-44 -rotate-6 rounded-3xl border border-white/10 bg-[#19191c] p-3 shadow-2xl sm:block">
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl">
                  <img src={previewProfiles[1].photo} alt="" className="size-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="font-bold">Zuri, 25</p>
                    <p className="mt-1 text-xs text-white/70">Watamu · Friendship</p>
                  </div>
                </div>
              </div>
              <div className="relative z-10 w-[min(76vw,310px)] rotate-2 rounded-[2.6rem] border border-white/15 bg-[#171719] p-2.5 shadow-[0_35px_100px_-30px_rgba(255,74,110,0.35)]">
                <div className="relative aspect-[0.59] overflow-hidden rounded-[2.1rem] bg-[#26262a]">
                  <img
                    src={previewProfiles[0].photo}
                    alt=""
                    className="absolute inset-0 size-full object-cover object-[center_30%]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/5" />
                  <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
                    <span className="rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-[10px] font-extrabold tracking-[0.14em] backdrop-blur">
                      MINGLEZA
                    </span>
                    <span className="rounded-full bg-[#ffe15a] px-2.5 py-1.5 text-[10px] font-extrabold text-black">
                      18+
                    </span>
                  </div>
                  <div className="absolute bottom-5 left-5 right-5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-[11px] font-semibold backdrop-blur">
                      <MapPin className="size-3" /> Mombasa, Kenya
                    </span>
                    <h2 className="mt-3 font-display text-3xl font-extrabold">Amina, 26</h2>
                    <p className="mt-2 text-sm leading-5 text-white/80">
                      Beach walks, good food, and genuine conversations.
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                      <span className="grid size-12 place-items-center rounded-full border border-white/15 bg-white/10 text-white">
                        <X className="size-5" />
                      </span>
                      <span className="grid size-14 flex-1 place-items-center rounded-full bg-[#ff4a6e] text-white shadow-lg shadow-[#ff4a6e]/25">
                        <Heart className="size-6 fill-current" />
                      </span>
                      <span className="grid size-12 place-items-center rounded-full border border-white/15 bg-white/10 text-white">
                        <MessageCircle className="size-5" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-8 right-0 z-20 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#19191c]/95 p-3 shadow-2xl backdrop-blur sm:right-1">
                <span className="grid size-10 place-items-center rounded-full bg-[#ffe15a] text-black">
                  <Heart className="size-5 fill-current" />
                </span>
                <span>
                  <span className="block text-sm font-extrabold">Your kind of connection</span>
                  <span className="mt-0.5 block text-xs text-white/55">Friendship or dating</span>
                </span>
              </div>
              <p className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center text-[10px] text-white/35">
                Illustrative interface preview · profiles shown are examples
              </p>
            </div>
          </div>
        </section>

        <section
          aria-label="Mingleza at a glance"
          className="border-y border-white/[0.08] bg-white/[0.025]"
        >
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-7 sm:px-6 md:grid-cols-4 lg:px-8">
            {[
              { icon: ShieldCheck, title: "18+ community", copy: "Adults-only access" },
              { icon: MapPin, title: "Kenya-first", copy: "Local towns and cities" },
              { icon: Users, title: "Your intent", copy: "Friendship or dating" },
              { icon: Heart, title: "Your choice", copy: "Connection on your terms" },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-3 rounded-2xl p-2 sm:p-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/[0.06] text-[#ffe15a]">
                  <item.icon className="size-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-extrabold text-white">{item.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-white/50">{item.copy}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section
          id="how-it-works"
          aria-labelledby="how-title"
          className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <SectionIntro
              eyebrow="How it works"
              title="A better connection starts with you"
              description="A simple path from joining to finding people who want the same kind of connection."
            />
            <ol className="grid gap-4 md:grid-cols-3">
              {[
                {
                  number: "01",
                  icon: BadgeCheck,
                  title: "Join as an adult",
                  copy: "Create your account and complete the 18+ confirmation before setting up your profile.",
                },
                {
                  number: "02",
                  icon: Users,
                  title: "Make it yours",
                  copy: "Add your display name, city, and a little about yourself. Choose friendship, dating, or both.",
                },
                {
                  number: "03",
                  icon: MessageCircle,
                  title: "Start a conversation",
                  copy: "Explore available profiles. Friendship requests unlock messaging when they are accepted.",
                },
              ].map((step) => (
                <li
                  key={step.number}
                  className="rounded-3xl border border-white/10 bg-[#141416] p-6 sm:p-8"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-12 place-items-center rounded-2xl bg-[#ffe15a] text-black">
                      <step.icon className="size-6" aria-hidden="true" />
                    </span>
                    <span className="font-display text-sm font-extrabold tracking-[0.2em] text-[#ffe15a]">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="mt-6 font-display text-xl font-extrabold">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/55">{step.copy}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="discover"
          aria-labelledby="discover-title"
          className="scroll-mt-24 border-y border-white/[0.07] bg-[#111113] px-4 py-20 sm:px-6 sm:py-24 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <SectionIntro
              eyebrow="A first look"
              title="Discover people, not just profiles"
              description="A glimpse of the experience. These are illustrative examples, not real member accounts."
            />
            <div className="grid gap-5 md:grid-cols-2">
              {previewProfiles.map((person) => (
                <article
                  key={person.name}
                  className="group grid grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] overflow-hidden rounded-3xl border border-white/10 bg-[#19191c]"
                >
                  <div className="relative min-h-[250px] overflow-hidden sm:min-h-[320px]">
                    <img
                      src={person.photo}
                      alt=""
                      loading="lazy"
                      className={cn(
                        "absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105",
                        person.position,
                      )}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <span className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur">
                      Example profile
                    </span>
                  </div>
                  <div className="flex flex-col justify-center p-4 sm:p-7">
                    <span className="w-fit rounded-full bg-[#ffe15a]/10 px-3 py-1.5 text-[11px] font-extrabold text-[#ffe15a]">
                      {person.intent}
                    </span>
                    <h3 className="mt-4 font-display text-2xl font-extrabold sm:text-3xl">
                      {person.name}, {person.age}
                    </h3>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-white/50">
                      <MapPin aria-hidden="true" className="size-4" />
                      {person.city}, Kenya
                    </p>
                    <p className="mt-4 text-sm leading-6 text-white/60">
                      Find people who share your intent and take the first step toward a genuine
                      connection.
                    </p>
                    <div className="mt-6 flex items-center gap-2 text-xs font-bold text-white/70">
                      <Heart aria-hidden="true" className="size-4 text-[#ff4a6e]" /> Discover
                      preview
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="mt-8 text-center">
              <SignUpLink label="Join Mingleza" />
            </div>
          </div>
        </section>

        <section aria-labelledby="intent-title" className="px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionIntro
              eyebrow="Your connection, your call"
              title="Friendship. Dating. Or both."
              description="Be clear about what you’re looking for, and explore profiles that have enabled the same intent."
            />
            <div className="grid gap-5 md:grid-cols-2">
              <article className="rounded-3xl border border-white/10 bg-[#141416] p-7 sm:p-9">
                <span className="grid size-14 place-items-center rounded-2xl bg-white/[0.06] text-[#ffe15a]">
                  <Users aria-hidden="true" className="size-7" />
                </span>
                <h3 id="intent-title" className="mt-5 font-display text-2xl font-extrabold">
                  Find your people
                </h3>
                <p className="mt-3 text-sm leading-7 text-white/55">
                  Make new friends, meet people with shared interests, and build a circle at your
                  own pace.
                </p>
                <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-4 py-2 text-xs font-bold text-emerald-300">
                  <span className="size-1.5 rounded-full bg-emerald-300" /> Friendship requests
                  available
                </p>
              </article>
              <article className="rounded-3xl border border-white/10 bg-[#141416] p-7 sm:p-9">
                <span className="grid size-14 place-items-center rounded-2xl bg-[#ff4a6e]/10 text-[#ff718b]">
                  <Heart aria-hidden="true" className="size-7 fill-current" />
                </span>
                <h3 className="mt-5 font-display text-2xl font-extrabold">Explore dating</h3>
                <p className="mt-3 text-sm leading-7 text-white/55">
                  Let people know you’re open to dating. Dating-specific likes, match scores, and
                  boosts are still being developed.
                </p>
                <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 text-xs font-bold text-white/60">
                  <Sparkles aria-hidden="true" className="size-3.5" /> More discovery tools planned
                </p>
              </article>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="cities-title"
          className="border-y border-white/[0.07] bg-[#111113] px-4 py-20 sm:px-6 sm:py-24 lg:px-8"
        >
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#ffe15a]">
                Kenya-first by design
              </p>
              <h2
                id="cities-title"
                className="mt-3 font-display text-3xl font-extrabold sm:text-4xl"
              >
                From coast to city, connections start close to home.
              </h2>
              <p className="mt-4 max-w-xl leading-7 text-white/55">
                Add the town or city you call home and discover members by the connection intent
                they have enabled. Live distance-based matching is not available yet.
              </p>
            </div>
            <ul
              aria-label="Example Kenyan cities"
              className="grid grid-cols-2 gap-3 sm:grid-cols-3"
            >
              {cities.map((city, index) => (
                <li
                  key={city}
                  className={cn(
                    "flex min-h-20 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm font-bold",
                    index % 2 === 1 && "sm:translate-y-3",
                  )}
                >
                  <MapPin aria-hidden="true" className="size-4 shrink-0 text-[#ffe15a]" />
                  {city}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="safety"
          aria-labelledby="safety-title"
          className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24 lg:px-8"
        >
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#ffe15a]">
                Safety matters
              </p>
              <h2
                id="safety-title"
                className="mt-3 font-display text-3xl font-extrabold sm:text-4xl"
              >
                Connection should feel considered.
              </h2>
              <p className="mt-4 max-w-xl leading-7 text-white/55">
                Mingleza puts adult access and clear member choices first. We’re transparent about
                the safety controls available today and the ones still to come.
              </p>
              <SignUpLink className="mt-7" />
            </div>
            <div className="grid gap-4">
              {[
                {
                  icon: ShieldCheck,
                  title: "Adults 18+ only",
                  copy: "Adult verification is required before profile setup is complete.",
                },
                {
                  icon: Users,
                  title: "Profile controls",
                  copy: "New profiles remain undiscoverable until setup is complete.",
                },
                {
                  icon: MessageCircle,
                  title: "Report and block",
                  copy: "Members can report or block profiles from Discover and profile views.",
                },
              ].map((item) => (
                <article
                  key={item.title}
                  className="flex gap-4 rounded-3xl border border-white/10 bg-[#141416] p-5 sm:p-6"
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/[0.06] text-[#ffe15a]">
                    <item.icon aria-hidden="true" className="size-6" />
                  </span>
                  <div>
                    <h3 className="font-extrabold">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-white/55">{item.copy}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="faq"
          aria-labelledby="faq-title"
          className="scroll-mt-24 border-y border-white/[0.07] bg-[#111113] px-4 py-20 sm:px-6 sm:py-24 lg:px-8"
        >
          <div className="mx-auto max-w-3xl">
            <SectionIntro
              eyebrow="Questions, answered"
              title="Good to know before you join"
              description="Clear answers about age requirements, discovery, and the features available today."
            />
            <Accordion
              type="single"
              collapsible
              className="rounded-3xl border border-white/10 bg-[#171719] px-5 sm:px-7"
            >
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={faq.question}
                  value={"faq-" + index}
                  className="border-white/10"
                >
                  <AccordionTrigger className="min-h-14 py-4 text-left text-base font-bold text-white hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-sm leading-6 text-white/55">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <a
              href="/faq"
              className="mt-5 inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold text-[#ffe15a] underline underline-offset-4 hover:text-white"
            >
              Read more FAQs <ArrowRight aria-hidden="true" className="ml-2 size-4" />
            </a>
          </div>
        </section>

        <section aria-labelledby="final-cta-title" className="px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#171719] px-6 py-14 text-center sm:px-12 sm:py-20">
            <div
              aria-hidden="true"
              className="absolute -right-16 -top-24 size-64 rounded-full bg-[#ff4a6e]/20 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-28 -left-16 size-72 rounded-full bg-[#ffe15a]/10 blur-3xl"
            />
            <div className="relative mx-auto max-w-2xl">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#ffe15a] text-black">
                <Heart aria-hidden="true" className="size-7 fill-current" />
              </span>
              <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.2em] text-[#ffe15a]">
                Your next chapter can start here
              </p>
              <h2
                id="final-cta-title"
                className="mt-3 font-display text-3xl font-extrabold sm:text-5xl"
              >
                Meet people on your wavelength.
              </h2>
              <p className="mt-4 leading-7 text-white/60">
                Create your profile, choose your intent, and explore connections across Kenya.
                Adults 18+ only.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 min-[420px]:flex-row">
                <SignUpLink />
                <LoginLink />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.08] bg-[#080809]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
          <div>
            <Wordmark />
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/45">
              A Kenya-first place to find friendship or dating. For adults 18+.
            </p>
          </div>
          <nav aria-label="Footer links" className="grid content-start gap-2">
            <h2 className="text-sm font-extrabold text-white">Explore</h2>
            <a
              className="inline-flex min-h-11 items-center text-sm text-white/55 hover:text-[#ffe15a]"
              href="/faq"
            >
              FAQ and help
            </a>
            <a
              className="inline-flex min-h-11 items-center text-sm text-white/55 hover:text-[#ffe15a]"
              href="/terms"
            >
              Terms of service
            </a>
            <a
              className="inline-flex min-h-11 items-center text-sm text-white/55 hover:text-[#ffe15a]"
              href="/privacy"
            >
              Privacy policy
            </a>
            <a
              className="inline-flex min-h-11 items-center text-sm text-white/55 hover:text-[#ffe15a]"
              href="#safety"
            >
              Safety
            </a>
          </nav>
          <div>
            <h2 className="text-sm font-extrabold text-white">Adults-only community</h2>
            <p className="mt-3 text-sm leading-6 text-white/45">
              Keep it kind, respect boundaries, and report behavior that makes the community less
              safe.
            </p>
            <p className="mt-4 text-sm font-extrabold text-[#ffe15a]">18+ only</p>
          </div>
        </div>
        <div className="border-t border-white/[0.08] px-4 py-4 text-center text-xs text-white/35">
          © {new Date().getFullYear()} Mingleza
        </div>
      </footer>
    </div>
  );
}
