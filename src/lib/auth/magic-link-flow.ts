export type MagicLinkFailure = "link_expired" | "link_failed";
export type WelcomeMode = "signin" | "profile" | undefined;

export function classifyMagicLinkFailure(message: string): MagicLinkFailure {
  return /expired|invalid|already(?: been)? used|used token/i.test(message)
    ? "link_expired"
    : "link_failed";
}

export function getMagicLinkRecoveryUrl(reason: MagicLinkFailure): string {
  return `/welcome?mode=signin&authError=${reason}`;
}

export function getWelcomeEntryState(input: {
  authComplete: boolean;
  authError: string;
  mode: WelcomeMode;
}) {
  const isKnownFailure = input.authError === "link_expired" || input.authError === "link_failed";
  const errorMessage =
    input.authError === "link_expired"
      ? "That sign-in link has expired or was already used. Enter your email below to request a new link."
      : input.authError === "link_failed"
        ? "We could not complete sign-in. Check your connection, then request a new sign-in link if needed."
        : "";

  return {
    signingIn: input.mode === "signin" || isKnownFailure,
    authed: input.authComplete || input.mode === "profile",
    step: input.authError
      ? 2
      : input.mode === "profile"
        ? 5
        : input.authComplete
          ? 1
          : input.mode === "signin"
            ? 2
            : 0,
    authMethod: input.authError ? ("email" as const) : ("phone" as const),
    error: errorMessage,
  };
}
