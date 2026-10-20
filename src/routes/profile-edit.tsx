import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ImagePlus, LoaderCircle, Save } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getMyProfile, setMyAvatarPath, updateMyProfile } from "@/lib/profile/server";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export const Route = createFileRoute("/profile-edit")({
  head: () => ({ meta: [{ title: "Edit profile · Mingleza" }] }),
  component: EditProfile,
});

type FormState = {
  displayName: string;
  bio: string;
  city: string;
  region: string;
  countryCode: string;
};

const emptyForm: FormState = {
  displayName: "",
  bio: "",
  city: "",
  region: "",
  countryCode: "KE",
};

function EditProfile() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [userId, setUserId] = useState("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    void getMyProfile().then(async (result) => {
      if (!active) return;
      if (!result.ok) {
        setError(result.message);
        setLoading(false);
        return;
      }
      const supabase = getSupabaseBrowserClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!active) return;
      setUserId(auth.user?.id ?? "");
      setForm({
        displayName: result.profile.display_name ?? "",
        bio: result.profile.bio ?? "",
        city: result.profile.city ?? "",
        region: result.profile.region ?? "",
        countryCode: result.profile.country_code ?? "KE",
      });
      setAvatarPath(result.profile.avatar_path);
      setLoading(false);
    }).catch(() => {
      if (active) {
        setError("Profile could not be loaded. Check your connection and retry.");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  const avatarUrl = (() => {
    if (!avatarPath) return "";
    const { data } = getSupabaseBrowserClient().storage.from("profile-avatars").getPublicUrl(avatarPath);
    return data.publicUrl;
  })();

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await updateMyProfile({ data: form });
      if (!result.ok) setError(result.message);
      else setNotice("Your profile has been saved.");
    } catch {
      setError("Profile could not be saved. Please retry.");
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file?: File) => {
    if (!file || !userId) return;
    setError("");
    setNotice("");
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("The photo must be 5 MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
      const path = userId + "/avatar." + ext;
      const supabase = getSupabaseBrowserClient();
      const uploaded = await supabase.storage.from("profile-avatars").upload(path, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: "3600",
      });
      if (uploaded.error) {
        setError("Photo upload failed. Check your connection and retry.");
        return;
      }
      const saved = await setMyAvatarPath({ data: { path } });
      if (!saved.ok) {
        setError(saved.message);
        return;
      }
      setAvatarPath(path);
      setNotice("Profile photo updated.");
    } catch {
      setError("Photo upload failed. Please retry.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppShell>
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <ArrowLeft className="size-4" /> Back to Discover
        </Link>
        <section className="rounded-3xl border bg-card p-5 shadow-soft sm:p-8">
          <h1 className="text-2xl font-extrabold">Edit your profile</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Share a little about yourself. Your exact location is never requested here.
          </p>

          {loading ? (
            <div className="flex items-center gap-2 py-12 text-muted-foreground">
              <LoaderCircle className="size-5 animate-spin" /> Loading profile…
            </div>
          ) : (
            <>
              <div className="mt-6 flex items-center gap-4">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Your profile" className="size-24 rounded-2xl object-cover" />
                ) : (
                  <div className="grid size-24 place-items-center rounded-2xl bg-secondary text-2xl font-bold text-primary">
                    {form.displayName.slice(0, 1).toUpperCase() || "M"}
                  </div>
                )}
                <div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-muted">
                    <ImagePlus className="size-4" />
                    {uploading ? "Uploading…" : "Change photo"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploading || !userId}
                      className="sr-only"
                      onChange={(event) => {
                        void uploadAvatar(event.currentTarget.files?.[0]);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <p className="mt-2 text-xs text-muted-foreground">JPG, PNG or WebP · up to 5 MB</p>
                </div>
              </div>

              <form onSubmit={(event) => void save(event)} className="mt-8 space-y-5">
                <Field label="Display name">
                  <input required minLength={2} maxLength={40} value={form.displayName}
                    onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                    className="w-full rounded-2xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
                </Field>
                <Field label="About you">
                  <textarea maxLength={300} rows={4} value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    placeholder="A few things you'd like people to know…"
                    className="w-full resize-y rounded-2xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
                  <span className="text-xs text-muted-foreground">{form.bio.length}/300</span>
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Town or city">
                    <input maxLength={80} value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="e.g. Watamu"
                      className="w-full rounded-2xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
                  </Field>
                  <Field label="County or region">
                    <input maxLength={80} value={form.region}
                      onChange={(e) => setForm({ ...form, region: e.target.value })}
                      placeholder="e.g. Kilifi"
                      className="w-full rounded-2xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
                  </Field>
                </div>
                <Field label="Country code">
                  <input required minLength={2} maxLength={2} pattern="[A-Za-z]{2}" value={form.countryCode}
                    onChange={(e) => setForm({ ...form, countryCode: e.target.value.toUpperCase() })}
                    className="w-28 rounded-2xl border bg-background px-4 py-3 uppercase outline-none focus:ring-2 focus:ring-ring" />
                </Field>
                {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
                {notice && <p role="status" className="rounded-xl bg-success/10 p-3 text-sm text-success">{notice}</p>}
                <button type="submit" disabled={saving || uploading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground hover:bg-primary-pressed disabled:cursor-not-allowed disabled:opacity-60">
                  <Save className="size-4" /> {saving ? "Saving…" : "Save profile"}
                </button>
              </form>
            </>
          )}
        </section>
      </main>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2 text-sm font-semibold">
      <span>{label}</span>
      {children}
    </label>
  );
}
