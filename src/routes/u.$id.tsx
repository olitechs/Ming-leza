import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Heart, MapPin, MessageCircle, Star, X, Flag } from "lucide-react";
import { AppShell, Chip } from "@/components/AppShell";
import { byId } from "@/lib/people";

export const Route = createFileRoute("/u/$id")({
  loader: ({ params }) => {
    const p = byId(params.id);
    if (!p) throw notFound();
    return { id: p.id };
  },
  head: ({ loaderData }) => {
    const p = loaderData ? byId(loaderData.id) : undefined;
    const t = p ? `${p.name}, ${p.age} · Mingleza` : "Profile · Mingleza";
    return {
      meta: [
        { title: t },
        { name: "description", content: p?.bio ?? "Profile on Mingleza" },
        { property: "og:title", content: t },
        { property: "og:description", content: p?.bio ?? "Profile on Mingleza" },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: Profile,
  notFoundComponent: () => <div className="p-10 text-center">This profile isn't available.</div>,
});

function Profile() {
  const { id } = Route.useLoaderData();
  const p = byId(id)!;
  const router = useRouter();
  const [photo, setPhoto] = useState(0);
  const isMe = p.id === "me";
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl lg:grid lg:grid-cols-2 lg:gap-10 lg:p-10">
        <div className="relative">
          <img
            src={p.gallery[photo]}
            alt={p.name}
            width={768}
            height={1024}
            className="aspect-[4/5] w-full object-cover lg:rounded-[28px]"
          />
          <button
            onClick={() => router.history.back()}
            aria-label="Back"
            className="absolute left-4 top-4 grid size-10 place-items-center rounded-full bg-card/90 shadow-soft"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="absolute inset-x-4 bottom-4 flex gap-2">
            {p.gallery.map((g, k) => (
              <button
                key={k}
                onClick={() => setPhoto(k)}
                className={`h-14 flex-1 overflow-hidden rounded-xl border-2 ${k === photo ? "border-card" : "border-transparent opacity-70"}`}
              >
                <img
                  src={g}
                  alt={`${p.name} photo ${k + 1}`}
                  width={768}
                  height={1024}
                  className="size-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
        <div className="-mt-6 relative rounded-t-[28px] bg-card p-6 lg:mt-0 lg:rounded-[28px] lg:shadow-soft">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-extrabold">
                {p.name}, {p.age}
              </h1>
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-4" />
                {p.area}
                {!isMe && ` · ${p.band}`}
              </p>
            </div>
            {!isMe && (
              <span className="rounded-full bg-secondary px-3 py-1 text-sm font-bold text-primary">
                {p.match}% match
              </span>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <Chip active>{p.intent}</Chip>
            {p.online && (
              <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold">
                <span className="size-2 rounded-full bg-success" />
                Online
              </span>
            )}
          </div>
          <h2 className="mt-6 text-sm font-bold">About</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.bio}</p>
          <h2 className="mt-6 text-sm font-bold">Interests</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {p.interests.map((i) => (
              <Chip key={i}>{i}</Chip>
            ))}
          </div>

          {isMe ? (
            <Link
              to="/welcome"
              search={{ authComplete: false, authError: "" }}
              className="mt-8 block rounded-full border-2 border-primary py-3 text-center font-semibold text-primary"
            >
              Redo onboarding
            </Link>
          ) : (
            <>
              <div className="mt-8 flex items-center justify-center gap-4">
                <Link
                  to="/"
                  aria-label="Pass"
                  className="grid size-14 place-items-center rounded-full border text-destructive shadow-soft"
                >
                  <X className="size-6" />
                </Link>
                <Link
                  to="/"
                  aria-label="Like"
                  className="grid size-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-card"
                >
                  <Heart className="size-7 fill-current" />
                </Link>
                <Link
                  to="/"
                  aria-label="Super like"
                  className="grid size-14 place-items-center rounded-full bg-accent text-accent-foreground shadow-soft"
                >
                  <Star className="size-6 fill-current" />
                </Link>
              </div>
              <div className="mt-6 flex justify-between text-sm">
                <Link
                  to="/messages"
                  className="flex items-center gap-1.5 font-semibold text-primary"
                >
                  <MessageCircle className="size-4" />
                  Message
                </Link>
                <button
                  aria-label="Report or block"
                  className="flex min-h-11 items-center gap-1.5 text-muted-foreground"
                >
                  <Flag className="size-4" />
                  Report or block
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
