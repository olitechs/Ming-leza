export type HomePageMode = "marketing" | "onboarding" | "discover";

export type HomePageAccess = {
  authenticated: boolean;
  adultVerified: boolean;
};

export function getHomePageMode(access: HomePageAccess): HomePageMode {
  if (!access.authenticated) return "marketing";
  return access.adultVerified ? "discover" : "onboarding";
}
