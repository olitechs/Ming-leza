import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, MapPin } from "lucide-react";
import { AppShell, Chip } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { getVisibleProfile } from "@/lib/profile/server";

export const Route = createFileRoute("/u/$id")({
  loader: async ({ params }) => {
    try {
      const result = await getVisibleProfile({ data: { id: params.id } });
      if (!result.ok) throw notFound();
      return result.profile;
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.displayName} · Mingleza` : "Profile · Mingleza";
    const description = loaderData?.bio?.trim() || "Profile on Mingleza";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: Profile,
  notFoundComponent: () => (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-extrabold">Profile not available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This profile may be unavailable or no longer visible.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Discover
        </Link>
      </div>
    </AppShell>
  ),
});

function Profile() {
  const profile = Route.useLoaderData();
  const location = [profile.city, profile.region, profile.countryCode].filter(
    (value): value is string => Boolean(value?.trim()),
  );
  const hasIntent = profile.friendsEnabled || profile.datingEnabled;

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:py-10">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary"
        >
          <ArrowLeft className="size-4" />
          Back to Discover
        </Link>
        <section className="rounded-3xl border bg-card p-5 shadow-soft sm:p-8">
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
            <Avatar
              name={profile.displayName}
              avatarPath={profile.avatarPath}
              className="size-28 bg-secondary text-3xl shadow-soft"
            />
            <div className="mt-4 sm:ml-6 sm:mt-2">
              <h1 className="text-3xl font-extrabold">{profile.displayName}</h1>
              {location.length > 0 && (
                <p className="mt-2 flex items-center justify-center gap-1 text-sm text-muted-foreground sm:justify-start">
                  <MapPin className="size-4" />
                  {location.join(", ")}
                </p>
              )}
            </div>
          </div>

          {hasIntent && (
            <div className="mt-6 flex flex-wrap justify-center gap-2 sm:justify-start">
              {profile.friendsEnabled && <Chip active>Friends</Chip>}
              {profile.datingEnabled && <Chip active>Dating</Chip>}
            </div>
          )}

          {profile.bio?.trim() && (
            <div className="mt-7 border-t pt-6">
              <h2 className="text-sm font-bold">About</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
