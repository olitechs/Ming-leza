import { describe, expect, it } from "vitest";
import { getHomePageMode, isCompleteDiscoverProfile } from "./homepage-routing";

describe("homepage routing", () => {
  it("shows the public marketing homepage to signed-out visitors", () => {
    expect(getHomePageMode({ authenticated: false, adultVerified: false })).toBe("marketing");
  });

  it("routes adult-verified members to Discover", () => {
    expect(getHomePageMode({ authenticated: true, adultVerified: true })).toBe("discover");
  });

  it("routes signed-in members without adult verification to onboarding", () => {
    expect(getHomePageMode({ authenticated: true, adultVerified: false })).toBe("onboarding");
  });

  it.each([
    [{ display_name: "", city: "Nairobi" }],
    [{ display_name: "   ", city: "Nairobi" }],
    [{ display_name: "New member", city: "Nairobi" }],
    [{ display_name: "Amina", city: "" }],
    [{ display_name: "Amina", city: "   " }],
    [{}],
  ])("marks incomplete profile details for the welcome redirect: %o", (profile) => {
    expect(isCompleteDiscoverProfile(profile)).toBe(false);
  });

  it("allows a complete named profile with a city into Discover", () => {
    expect(isCompleteDiscoverProfile({ display_name: "Amina", city: "Watamu" })).toBe(true);
  });
});
