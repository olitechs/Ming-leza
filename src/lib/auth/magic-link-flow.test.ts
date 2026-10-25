import { describe, expect, it } from "vitest";
import {
  classifyMagicLinkFailure,
  getMagicLinkRecoveryUrl,
  getWelcomeEntryState,
} from "./magic-link-flow";

describe("passwordless email-link flow", () => {
  it("distinguishes expired credentials from other callback failures", () => {
    expect(classifyMagicLinkFailure("Email link is invalid or has expired")).toBe("link_expired");
    expect(classifyMagicLinkFailure("This token has already been used")).toBe("link_expired");
    expect(classifyMagicLinkFailure("Network request failed")).toBe("link_failed");
  });

  it("returns failed email links to the email sign-in flow rather than signup", () => {
    expect(getMagicLinkRecoveryUrl("link_expired")).toBe(
      "/welcome?mode=signin&authError=link_expired",
    );
    expect(getMagicLinkRecoveryUrl("link_failed")).toBe(
      "/welcome?mode=signin&authError=link_failed",
    );

    const state = getWelcomeEntryState({
      authComplete: false,
      authError: "link_expired",
      mode: "signin",
    });
    expect(state).toEqual({
      signingIn: true,
      authed: false,
      step: 2,
      authMethod: "email",
      error:
        "That sign-in link has expired or was already used. Enter your email below to request a new link.",
    });
  });

  it("keeps transient callback failures in sign-in and does not falsely call them expired", () => {
    const state = getWelcomeEntryState({
      authComplete: false,
      authError: "link_failed",
      mode: "signin",
    });
    expect(state.signingIn).toBe(true);
    expect(state.step).toBe(2);
    expect(state.authMethod).toBe("email");
    expect(state.error).toMatch(/could not complete sign-in/i);
    expect(state.error).not.toMatch(/expired/i);
  });

  it("preserves separate signup, age-verification, and profile-completion entry states", () => {
    expect(
      getWelcomeEntryState({ authComplete: false, authError: "", mode: undefined }),
    ).toMatchObject({ signingIn: false, authed: false, step: 0, authMethod: "phone" });
    expect(
      getWelcomeEntryState({ authComplete: true, authError: "", mode: undefined }),
    ).toMatchObject({ signingIn: false, authed: true, step: 1 });
    expect(
      getWelcomeEntryState({ authComplete: false, authError: "", mode: "profile" }),
    ).toMatchObject({ signingIn: false, authed: true, step: 5 });
  });
});
