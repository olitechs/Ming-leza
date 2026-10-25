import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Download,
  ImagePlus,
  LifeBuoy,
  LoaderCircle,
  LogOut,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { signOutAndLeave } from "@/lib/auth/sign-out";
import { deleteMyAccount, exportMyData, getMyAccess } from "@/lib/auth/server";
import { AppShell } from "@/components/AppShell";
import { Field as BrandField, Input as BrandInput } from "@/components/brand";
import {
  getMyProfile,
  listSupportedCountries,
  setMyAvatarPath,
  updateMyProfile,
} from "@/lib/profile/server";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { listMySupportRequests, submitSupportRequest } from "@/lib/support/server";

export const Route = createFileRoute("/profile-edit")({
  beforeLoad: async () => {
    const access = await getMyAccess();
    if (!access.authenticated || !access.adultVerified)
      throw redirect({ to: "/login", search: { mode: "signin" } });
  },
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

type Country = { code: string; name: string };

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
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [accountError, setAccountError] = useState("");
  const [accountNotice, setAccountNotice] = useState("");
  const [supportCategory, setSupportCategory] = useState<"account" | "privacy" | "technical" | "safety" | "other">("account");
  const [supportSubject, setSupportSubject] = useState("");
  const [supportDetails, setSupportDetails] = useState("");
  const [supportBusy, setSupportBusy] = useState(false);
  const [supportError, setSupportError] = useState("");
  const [supportNotice, setSupportNotice] = useState("");
  const [supportRequests, setSupportRequests] = useState<
    { id: string; category: string; subject: string; status: string; created_at: string }[]
  >([]);

  useEffect(() => {
    let active = true;
    void listMySupportRequests().then((result) => {
      if (active && result.ok) setSupportRequests(result.requests);
    });
    return () => {
      active = false;
    };
  }, []);

  const downloadMyData = async () => {
    setExporting(true);
    setAccountError("");
    setAccountNotice("");
    try {
      const result = await exportMyData();
      if (!result.ok) {
        setAccountError(result.message);
        return;
      }
      const blob = new Blob([JSON.stringify({
        generatedAt: result.generatedAt,
        data: result.data,
        truncated: result.truncated,
      }, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `mingleza-personal-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setAccountNotice(
        result.truncated
          ? "Your export downloaded, but conversation history reached the 10,000-message limit. Request additional data through support."
          : "Your personal data export has been downloaded to this device.",
      );
    } catch {
      setAccountError("Your data export is temporarily unavailable. Please retry.");
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    setAccountError("");
    setAccountNotice("");
    if (deleteConfirmation !== "DELETE") {
      setAccountError('Type DELETE exactly to confirm account deletion.');
      return;
    }
    setDeleting(true);
    try {
      const result = await deleteMyAccount({ data: { confirmation: "DELETE" } });
      if (!result.ok) {
        setAccountError(result.message);
        return;
      }
      window.location.replace("/welcome?accountDeleted=1");
    } catch {
      setAccountError("Account deletion is temporarily unavailable. Please retry.");
    } finally {
      setDeleting(false);
    }
  };

  const sendSupportRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSupportBusy(true);
    setSupportError("");
    setSupportNotice("");
    try {
      const result = await submitSupportRequest({
        data: {
          category: supportCategory,
          subject: supportSubject,
          details: supportDetails,
        },
      });
      if (!result.ok) {
        setSupportError(result.message);
        return;
      }
      setSupportRequests((current) => [result.request, ...current].slice(0, 50));
      setSupportSubject("");
      setSupportDetails("");
      setSupportNotice("Your request was saved. It will remain in your request history while the team reviews it.");
    } catch {
      setSupportError("Your support request could not be submitted. Please retry.");
    } finally {
      setSupportBusy(false);
    }
  };

  useEffect(() => {
    let active = true;
    void Promise.all([getMyProfile(), listSupportedCountries()])
      .then(async ([result, countryResult]) => {
        if (!active) return;
        if (!countryResult.ok) {
          setError(countryResult.message);
          setLoading(false);
          return;
        }
        setCountries(countryResult.countries as Country[]);
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
      })
      .catch(() => {
        if (active) {
          setError("Profile could not be loaded. Check your connection and retry.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const avatarUrl = (() => {
    if (!avatarPath) return "";
    const { data } = getSupabaseBrowserClient()
      .storage.from("profile-avatars")
      .getPublicUrl(avatarPath);
    return data.publicUrl;
  })();

  const save = async (event: FormEvent<HTMLFormElement>) => {
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
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
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
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary"
        >
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
                  <img
                    src={avatarUrl}
                    alt="Your profile"
                    width={768}
                    height={1024}
                    className="size-24 rounded-2xl object-cover"
                  />
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
                  <p className="mt-2 text-xs text-muted-foreground">
                    JPG, PNG or WebP · up to 5 MB
                  </p>
                </div>
              </div>
              <form
                onSubmit={(event) => void save(event)}
                aria-describedby={error ? "profile-form-error" : undefined}
                className="mt-8 space-y-5"
              >
                <BrandField label="Display name" htmlFor="display-name">
                  <BrandInput
                    id="display-name"
                    required
                    minLength={2}
                    maxLength={40}
                    value={form.displayName}
                    onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                    className="w-full rounded-2xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
                  />
                </BrandField>
                <BrandField label="About you" htmlFor="bio">
                  <textarea
                    id="bio"
                    maxLength={300}
                    rows={4}
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    placeholder="A few things you'd like people to know…"
                    className="w-full resize-y rounded-2xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="text-xs text-muted-foreground">{form.bio.length}/300</span>
                </BrandField>
                <div className="grid gap-5 sm:grid-cols-2">
                  <BrandField label="Town or city" htmlFor="city">
                    <BrandInput
                      id="city"
                      maxLength={80}
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="e.g. Watamu"
                      className="w-full rounded-2xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
                    />
                  </BrandField>
                  <BrandField label="County or region" htmlFor="region">
                    <BrandInput
                      id="region"
                      maxLength={80}
                      value={form.region}
                      onChange={(e) => setForm({ ...form, region: e.target.value })}
                      placeholder="e.g. Kilifi"
                      className="w-full rounded-2xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
                    />
                  </BrandField>
                </div>
                <BrandField label="Country" htmlFor="country-code">
                  <select
                    id="country-code"
                    required
                    value={form.countryCode}
                    onChange={(e) =>
                      setForm({ ...form, countryCode: e.target.value.toUpperCase() })
                    }
                    className="min-h-11 w-full rounded-2xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
                  >
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name} ({country.code})
                      </option>
                    ))}
                  </select>
                </BrandField>
                {error && (
                  <p
                    id="profile-form-error"
                    role="alert"
                    className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive-text"
                  >
                    {error}
                  </p>
                )}
                {notice && (
                  <p
                    role="status"
                    className="rounded-xl bg-success/10 p-3 text-sm text-success-text"
                  >
                    {notice}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground hover:bg-primary-pressed disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="size-4" /> {saving ? "Saving…" : "Save profile"}
                </button>
              </form>
            </>
          )}
        </section>
        <section className="mt-6 rounded-3xl border bg-card p-5 shadow-soft sm:p-8">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 size-6 shrink-0 text-primary" />
            <div>
              <h2 className="text-xl font-extrabold">Account & privacy</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Download a copy of your profile, preferences, blocks, friend requests, reports you submitted, and conversation history. Account deletion removes your profile photos and account-linked application records. This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 rounded-full"
              disabled={exporting || deleting}
              onClick={() => void downloadMyData()}
            >
              <Download className="size-4" />
              {exporting ? "Preparing export…" : "Download my data"}
            </Button>
          </div>
          <div className="mt-6 rounded-2xl border border-destructive/30 p-4">
            <h3 className="flex items-center gap-2 font-bold text-destructive-text">
              <Trash2 className="size-4" /> Delete account permanently
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Export anything you want to keep first. Deletion removes your sign-in account, profile, avatar files, and records linked by the app's deletion rules. Your submitted reports are subject to the current database cascade; the final legal retention policy still needs owner/legal review.
            </p>
            <label htmlFor="delete-account-confirmation" className="mt-4 block text-sm font-semibold">
              Type DELETE to confirm
            </label>
            <input
              id="delete-account-confirmation"
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              autoComplete="off"
              className="mt-2 min-h-11 w-full rounded-xl border bg-background px-3 text-sm"
              placeholder="DELETE"
              disabled={deleting}
            />
            <Button
              type="button"
              className="mt-3 min-h-11 rounded-full"
              disabled={deleting || deleteConfirmation !== "DELETE"}
              onClick={() => void deleteAccount()}
            >
              <Trash2 className="size-4" />
              {deleting ? "Deleting account…" : "Delete my account"}
            </Button>
          </div>
          {accountError && (
            <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive-text">
              {accountError}
            </p>
          )}
          {accountNotice && (
            <p role="status" className="mt-4 rounded-xl bg-success/10 p-3 text-sm text-success-text">
              {accountNotice}
            </p>
          )}
        </section>

        <section className="mt-6 rounded-3xl border bg-card p-5 shadow-soft sm:p-8">
          <div className="flex items-start gap-3">
            <LifeBuoy className="mt-1 size-6 shrink-0 text-primary" />
            <div>
              <h2 className="text-xl font-extrabold">Contact support</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Submit a private in-app request about your account, privacy, safety, or a technical issue. This creates a tracked request; it does not guarantee an immediate response or emergency support.
              </p>
            </div>
          </div>
          <form onSubmit={(event) => void sendSupportRequest(event)} className="mt-5 space-y-4">
            <div>
              <label htmlFor="support-category" className="text-sm font-semibold">Request type</label>
              <select
                id="support-category"
                value={supportCategory}
                onChange={(event) => setSupportCategory(event.target.value as typeof supportCategory)}
                className="mt-2 min-h-11 w-full rounded-xl border bg-background px-3 text-sm"
              >
                <option value="account">Account access</option>
                <option value="privacy">Privacy or personal data</option>
                <option value="technical">Technical issue</option>
                <option value="safety">Safety concern</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="support-subject" className="text-sm font-semibold">Subject</label>
              <input
                id="support-subject"
                value={supportSubject}
                onChange={(event) => setSupportSubject(event.target.value)}
                minLength={3}
                maxLength={120}
                required
                className="mt-2 min-h-11 w-full rounded-xl border bg-background px-3 text-sm"
                placeholder="Briefly describe the issue"
              />
            </div>
            <div>
              <label htmlFor="support-details" className="text-sm font-semibold">Details</label>
              <textarea
                id="support-details"
                value={supportDetails}
                onChange={(event) => setSupportDetails(event.target.value)}
                minLength={10}
                maxLength={4000}
                rows={4}
                required
                className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                placeholder="Share the details needed to understand your request."
              />
              <p className="mt-1 text-xs text-muted-foreground">{supportDetails.length}/4000</p>
            </div>
            <Button type="submit" className="min-h-11 rounded-full" disabled={supportBusy}>
              <LifeBuoy className="size-4" />
              {supportBusy ? "Submitting…" : "Submit support request"}
            </Button>
          </form>
          {supportError && (
            <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive-text">
              {supportError}
            </p>
          )}
          {supportNotice && (
            <p role="status" className="mt-4 rounded-xl bg-success/10 p-3 text-sm text-success-text">
              {supportNotice}
            </p>
          )}
          {supportRequests.length > 0 && (
            <div className="mt-6 border-t pt-5">
              <h3 className="font-bold">Your recent requests</h3>
              <ul className="mt-3 space-y-2">
                {supportRequests.map((request) => (
                  <li key={request.id} className="rounded-xl bg-secondary/50 p-3">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="text-sm font-semibold">{request.subject}</span>
                      <span className="rounded-full border px-2 py-1 text-xs">{request.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {request.category} · {new Date(request.created_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <button
          type="button"
          onClick={() => void signOutAndLeave()
          className="mx-auto mt-6 flex cursor-pointer items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold hover:bg-muted"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </div>
    </AppShell>
  );
}
