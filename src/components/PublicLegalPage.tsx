import { ArrowLeft, Heart } from "lucide-react";
import { Button } from "@/components/brand";

export function PublicLegalPage({ title, summary }: { title: string; summary: string }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only fixed left-3 top-3 z-50 rounded-full bg-card px-5 py-3 font-semibold text-foreground shadow-card focus:not-sr-only focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Skip to content
      </a>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
          <a
            href="/"
            aria-label="Mingleza home"
            className="inline-flex min-h-11 items-center gap-2 rounded-full font-display text-lg font-extrabold"
          >
            <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
              <Heart aria-hidden="true" className="size-4 fill-current" />
            </span>
            Mingleza
          </a>
          <Button asChild variant="outline" className="min-h-11 cursor-pointer rounded-full">
            <a href="/">
              <ArrowLeft aria-hidden="true" className="mr-2 size-4" />
              Back to home
            </a>
          </Button>
        </div>
      </header>
      <main id="main-content" className="px-4 py-12 sm:px-6 sm:py-16">
        <article className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-10">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">
            Draft document
          </p>
          <h1 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">{title}</h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">{summary}</p>
          <div
            role="note"
            className="mt-8 rounded-2xl border border-accent/40 bg-accent/15 p-5 text-foreground"
          >
            <p className="font-bold">Draft — pending legal review.</p>
            <p className="mt-2 text-sm leading-6">
              This page is a temporary placeholder. It is not final legal text or legal advice.
            </p>
          </div>
          <p className="mt-7 leading-7 text-muted-foreground">
            Mingleza is preparing a reviewed version of this document. Until that review is
            complete, this page does not describe final terms or privacy practices. Please check
            back for the approved version.
          </p>
          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            Support contact details are coming soon.
          </p>
          <div className="mt-8">
            <Button
              asChild
              className="min-h-11 cursor-pointer rounded-full hover:bg-primary-pressed"
            >
              <a href="/">Return to Mingleza</a>
            </Button>
          </div>
        </article>
      </main>
      <footer className="border-t border-border bg-card px-4 py-5 text-center text-sm text-muted-foreground">
        Mingleza · Adults 18+ only
      </footer>
    </div>
  );
}
