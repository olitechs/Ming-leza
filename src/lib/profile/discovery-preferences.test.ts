import { describe, expect, it } from "vitest";
import { getDiscoveryPreferencesValidationMessage } from "./discovery-preferences";

const visibleWithFriendship = {
  isDiscoverable: true,
  friendsEnabled: true,
  datingEnabled: false,
};

describe("discovery preference validation", () => {
  it("allows a complete adult-verified profile to enable discovery with an intent", () => {
    expect(
      getDiscoveryPreferencesValidationMessage(
        { display_name: "Amina", city: "Watamu" },
        visibleWithFriendship,
      ),
    ).toBeNull();
  });

  it("requires a display name and city before enabling discovery", () => {
    expect(
      getDiscoveryPreferencesValidationMessage(
        { display_name: "New Member", city: "Watamu" },
        visibleWithFriendship,
      ),
    ).toMatch(/display name and city/i);
    expect(
      getDiscoveryPreferencesValidationMessage(
        { display_name: "Amina", city: null },
        visibleWithFriendship,
      ),
    ).toMatch(/display name and city/i);
  });

  it("requires at least one connection intent for a discoverable profile", () => {
    expect(
      getDiscoveryPreferencesValidationMessage(
        { display_name: "Amina", city: "Watamu" },
        { isDiscoverable: true, friendsEnabled: false, datingEnabled: false },
      ),
    ).toMatch(/at least one connection intent/i);
  });

  it("always allows a verified member to hide their profile", () => {
    expect(
      getDiscoveryPreferencesValidationMessage(
        { display_name: "", city: null },
        { isDiscoverable: false, friendsEnabled: false, datingEnabled: false },
      ),
    ).toBeNull();
  });

  it("accepts dating-only and friendship-only discovery", () => {
    const profile = { display_name: "Amina", city: "Watamu" };
    expect(
      getDiscoveryPreferencesValidationMessage(profile, {
        isDiscoverable: true,
        friendsEnabled: false,
        datingEnabled: true,
      }),
    ).toBeNull();
    expect(getDiscoveryPreferencesValidationMessage(profile, visibleWithFriendship)).toBeNull();
  });
});
