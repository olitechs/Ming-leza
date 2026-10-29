import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const avatarPathPattern = /^[0-9a-f-]{36}\/avatar\.(?:jpg|png|webp)$/i;
const SIGNED_URL_TTL_SECONDS = 60;
const SIGNED_URL_REFRESH_MS = 45_000;

export function usePrivateAvatarUrl(path: string | null | undefined) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    setSignedUrl(null);

    if (!path || !avatarPathPattern.test(path)) return;

    const refreshSignedUrl = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase.storage
          .from("profile-avatars")
          .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
        if (active) setSignedUrl(error ? null : (data?.signedUrl ?? null));
      } catch {
        if (active) setSignedUrl(null);
      }
    };

    void refreshSignedUrl();
    const refreshTimer = setInterval(() => void refreshSignedUrl(), SIGNED_URL_REFRESH_MS);

    return () => {
      active = false;
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, [path]);

  return signedUrl;
}

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "?";
}

export function Avatar({
  name,
  avatarPath,
  className = "",
}: {
  name: string;
  avatarPath?: string | null;
  className?: string;
}) {
  const imageUrl = usePrivateAvatarUrl(avatarPath);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    setFailedImageUrl((failedUrl) => (failedUrl !== imageUrl ? null : failedUrl));
  }, [imageUrl]);

  const displayName = name.trim() || "Member";
  const usableImageUrl = imageUrl && failedImageUrl !== imageUrl ? imageUrl : null;

  return (
    <span
      role="img"
      aria-label={`${displayName}'s profile photo`}
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 font-bold text-primary ${className}`}
    >
      {usableImageUrl ? (
        <img
          src={usableImageUrl}
          alt=""
          aria-hidden="true"
          className="size-full object-cover"
          onError={() => setFailedImageUrl(usableImageUrl)}
        />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}
