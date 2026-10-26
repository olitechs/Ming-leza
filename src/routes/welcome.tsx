import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PasswordAuthFlow } from "@/components/PasswordAuthFlow";
import { verifyAdult, getMyAccess, setMyIntent } from "@/lib/auth/server";
import { completeMyProfileSetup, getMyProfile, setMyAvatarPath } from "@/lib/profile/server";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export const Route = createFileRoute("/welcome")({
  validateSearch: (search: Record<string, unknown>) => ({
    authComplete: search["authComplete"] === true || search["authComplete"] === "true",
    authError: typeof search["authError"] === "string" ? search["authError"] : "",
    ...(search["mode"] === "signin" || search["mode"] === "profile"
      ? { mode: search["mode"] as "signin" | "profile" }
      : {}),
  }),
  head: () => ({ meta: [{ title: "Sign in or join Mingleza" }] }),
  component: Welcome,
});

function Welcome() {
  const { authComplete, authError, mode } = Route.useSearch();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdultVerified, setIsAdultVerified] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [dob, setDob] = useState("");
  const [friendsEnabled, setFriendsEnabled] = useState(true);
  const [datingEnabled, setDatingEnabled] = useState(false);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [error, setError] = useState(
    authError
      ? "This link is invalid, expired, or already used. Sign in with your password or request a password reset."
      : "",
  );
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    if (!authComplete && mode !== "profile") return;
    let active = true;
    void (async () => {
      const access = await getMyAccess();
      if (!active) return;
      if (!access.authenticated) {
        setError("Your session has expired. Please sign in again.");
        return;
      }
      setIsAuthenticated(true);
      setIsAdultVerified(access.adultVerified);
      if (access.adultVerified || mode === "profile") {
        const profile = await getMyProfile();
        if (!active || !profile.ok) return;
        setDisplayName(
          profile.profile.display_name === "New member" ? "" : profile.profile.display_name,
        );
        setCity(profile.profile.city ?? "");
        setFriendsEnabled(profile.profile.friends_enabled);
        setDatingEnabled(profile.profile.dating_enabled);
        setAvatarPath(profile.profile.avatar_path);
      }
    })();
    return () => {
      active = false;
    };
  }, [authComplete, mode]);

  if (!authComplete && mode !== "profile") {
    return <PasswordAuthFlow initialMode={mode === "signin" ? "signin" : "signup"} />;
  }

  const verifyAge = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await verifyAdult({ data: { dateOfBirth: dob } });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setIsAdultVerified(true);
      const profile = await getMyProfile();
      if (profile.ok) {
        setDisplayName(
          profile.profile.display_name === "New member" ? "" : profile.profile.display_name,
        );
        setCity(profile.profile.city ?? "");
      }
    } catch {
      setError("We could not verify your age. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await completeMyProfileSetup({
        data: { displayName: displayName.trim(), city: city.trim() },
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      const savedIntent = await setMyIntent({ data: { friendsEnabled, datingEnabled } });
      if (!savedIntent.ok) {
        setError(savedIntent.message);
        return;
      }
      await nav({ to: "/" });
    } catch {
      setError("Profile setup could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Choose a JPG, PNG or WebP image no larger than 5 MB.");
      event.target.value = "";
      return;
    }
    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) {
        setError("Sign in again before adding a photo.");
        return;
      }
      const extension =
        file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
      const path = `${auth.user.id}/avatar.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("profile-avatars")
        .upload(path, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: "3600",
        });
      if (uploadError) {
        setError("Photo upload failed. Check your connection and retry.");
        return;
      }
      const saved = await setMyAvatarPath({ data: { path } });
      if (!saved.ok) {
        setError(saved.message);
        return;
      }
      setAvatarPath(path);
    } catch {
      setError("Photo upload failed. Please retry.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  };

  const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const avatarUrl =
    avatarPath && supabaseUrl
      ? `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/profile-avatars/${avatarPath.split("/").map(encodeURIComponent).join("/")}`
      : "";

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <section className="w-full max-w-md rounded-[32px] bg-card p-6 shadow-card sm:p-8">
        <a href="/" className="text-sm font-semibold text-primary">
          Mingleza
        </a>
        {!isAuthenticated ? (
          <div className="mt-6">
            <h1 className="text-2xl font-extrabold">Continue setting up</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Your sign-in session could not be confirmed.
            </p>
            <a
              className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground"
              href="/welcome?mode=signin"
            >
              Return to sign in
            </a>
          </div>
        ) : !isAdultVerified ? (
          <>
            <h1 className="mt-5 text-2xl font-extrabold">Confirm you are 18 or older</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Mingleza is for adults only. Your date of birth is used only to verify eligibility; it
              is not stored.
            </p>
            <form className="mt-6 space-y-4" onSubmit={verifyAge}>
              <label className="block text-sm font-semibold">
                Date of birth
                <input
                  className="mt-2 w-full rounded-2xl border bg-background px-4 py-3"
                  type="date"
                  autoComplete="bday"
                  value={dob}
                  onChange={(event) => setDob(event.target.value)}
                  required
                />
              </label>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <button
                className="w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-60"
                disabled={busy}
              >
                {busy ? "Checking…" : "Verify age"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="mt-5 text-2xl font-extrabold">Finish your profile</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose how you want to meet people. You can change these details later.
            </p>
            <form className="mt-6 space-y-4" onSubmit={saveProfile}>
              <label className="block text-sm font-semibold">
                Display name
                <input
                  className="mt-2 w-full rounded-2xl border bg-background px-4 py-3"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  minLength={2}
                  maxLength={40}
                  required
                />
              </label>
              <label className="block text-sm font-semibold">
                Town or city
                <input
                  className="mt-2 w-full rounded-2xl border bg-background px-4 py-3"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  minLength={2}
                  maxLength={80}
                  required
                />
              </label>
              <label className="block text-sm font-semibold">
                Profile photo <span className="font-normal text-muted-foreground">(optional)</span>
                <input
                  className="mt-2 w-full rounded-2xl border bg-background px-4 py-3 font-normal"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => void uploadAvatar(event)}
                  disabled={busy}
                />
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  JPG, PNG or WebP, up to 5 MB. Avoid uploading sensitive images.
                </span>
              </label>
              {avatarUrl && (
                <img
                  src={avatarUrl}
                  alt="Your profile photo"
                  className="size-20 rounded-full object-cover"
                />
              )}
              <fieldset className="space-y-3 rounded-2xl border p-4">
                <legend className="px-1 text-sm font-semibold">I’m here to</legend>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={friendsEnabled}
                    onChange={(event) => setFriendsEnabled(event.target.checked)}
                  />
                  Make friends
                </label>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={datingEnabled}
                    onChange={(event) => setDatingEnabled(event.target.checked)}
                  />
                  Meet people for dating
                </label>
              </fieldset>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <button
                className="w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-60"
                disabled={busy || (!friendsEnabled && !datingEnabled)}
              >
                {busy ? "Saving…" : "Continue to Discover"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
