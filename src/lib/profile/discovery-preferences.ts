export type DiscoveryPreferenceValues = {
  isDiscoverable: boolean;
  friendsEnabled: boolean;
  datingEnabled: boolean;
};

export type DiscoveryProfileDetails = {
  display_name: string | null;
  city: string | null;
};

/**
 * Mirrors the database guard used by discovery preferences:
 * a visible profile must be complete and opt into at least one intent.
 * Hiding a profile is always allowed for an adult-verified member.
 */
export function getDiscoveryPreferencesValidationMessage(
  profile: DiscoveryProfileDetails,
  preferences: DiscoveryPreferenceValues,
): string | null {
  if (!preferences.isDiscoverable) return null;

  const displayName = profile.display_name?.trim() ?? "";
  const city = profile.city?.trim() ?? "";

  if (!displayName || displayName.toLowerCase() === "new member" || !city) {
    return "Add your display name and city before making your profile discoverable.";
  }

  if (!preferences.friendsEnabled && !preferences.datingEnabled) {
    return "Choose at least one connection intent before making your profile discoverable.";
  }

  return null;
}
