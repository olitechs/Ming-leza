import { createFileRoute, redirect } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getMyAccess } from "@/lib/auth/server";

export const Route = createFileRoute("/explore")({
  beforeLoad: async () => {
    const access = await getMyAccess();
    if (!access.authenticated || !access.adultVerified)
      throw redirect({ to: "/welcome", search: { authComplete: false, authError: "" } });
  },
  head: () => ({
    meta: [
      { title: "Explore · Mingleza" },
      {
        name: "description",
        content: "Explore nearby areas on Mingleza. Location discovery is coming soon.",
      },
    ],
  }),
  component: Explore,
});

function Explore() {
  return (
    <AppShell>
      <section className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-3xl flex-col justify-center px-4 py-10 sm:px-6 lg:min-h-screen">
        <h1 className="mb-6 text-3xl font-extrabold">Explore</h1>
        <div className="rounded-3xl border-2 border-dashed bg-card p-8 text-center shadow-soft sm:p-12">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-secondary text-primary">
            <MapPin className="size-8" aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-2xl font-bold">Area discovery is coming soon</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
            We’re working on privacy-safe local discovery. No demo profiles or map locations are
            shown here.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
