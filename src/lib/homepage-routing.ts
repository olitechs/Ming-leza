export type HomePageMode = "marketing" | "onboarding" | "discover";

export type HomePageAccess = {
  authenticated: boolean;
  adultVerified: boolean;
};

export function getHomePageMode(access: HomePageAccess): HomePageMode {
  if (!access.authenticated) return "marketing";
  return access.adultVerified ? "discover" : "onboarding";
}


export type DiscoverProfileBasics = {
  display_name?: string | null;
  city?: string | null;
};

export function isCompleteDiscoverProfile(profile: DiscoverProfileBasics): boolean {
  const displayName = profile.display_name?.trim() ?? "";
  const city = profile.city?.trim() ?? "";
  return Boolean(displayName && displayName.toLowerCase() !== "new member" && city);
}
