import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { exchangeEmailMagicLink, getMyAccess } from "@/lib/auth/server";
import { classifyMagicLinkFailure, getMagicLinkRecoveryUrl } from "@/lib/auth/magic-link-flow";

export const Route = createFileRoute("/auth-callback")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search["code"] === "string" ? search["code"] : "",
    tokenHash: typeof search["token_hash"] === "string" ? search["token_hash"] : "",
    type: typeof search["type"] === "string" ? search["type"] : "",
    error:
      typeof search["error_description"] === "string"
        ? search["error_description"]
        : typeof search["error"] === "string"
          ? search["error"]
          : "",
  }),
  head: () => ({ meta: [{ title: "Signing in · Mingleza" }] }),
  component: AuthCallback,
});

function AuthCallback() {
  const { code, tokenHash, type, error } = Route.useSearch();
  const [message, setMessage] = useState("Completing your secure sign-in…");
  const processed = useRef(false);

  useEffect(() => {
    // Email verification credentials are single-use. React may replay effects in
    // development, so keep the exchange to one request for this mounted callback.
    if (processed.current) return;
    processed.current = true;

    const returnToSignIn = (reason: "link_expired" | "link_failed") => {
      window.location.replace(getMagicLinkRecoveryUrl(reason));
    };

    if (error) {
      returnToSignIn(classifyMagicLinkFailure(error));
      return;
    }

    if (!code && !(tokenHash && ["magiclink", "email", "signup"].includes(type))) {
      returnToSignIn("link_failed");
      return;
    }

    exchangeEmailMagicLink({
      data: code ? { code } : { tokenHash, type: type as "magiclink" | "email" | "signup" },
    })
      .then(async (result) => {
        if (!result.ok) {
          returnToSignIn(result.reason);
          return;
        }
        // Returning adults go straight in; new members continue to the age step.
        const access = await getMyAccess();
        window.location.replace(
          access.authenticated && access.adultVerified ? "/" : "/welcome?authComplete=true",
        );
      })
      .catch(() => {
        setMessage("We could not complete sign-in. Returning you to sign in…");
        returnToSignIn("link_failed");
      });
  }, [code, tokenHash, type, error]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <section className="w-full max-w-md rounded-3xl border bg-card p-8 text-center shadow-card">
        <h1 className="text-2xl font-extrabold">Sign in to Mingleza</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground" role="status">
          {message}
        </p>
        <a
          href={getMagicLinkRecoveryUrl("link_failed")}
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground"
        >
          Return to Mingleza
        </a>
      </section>
    </main>
  );
}
