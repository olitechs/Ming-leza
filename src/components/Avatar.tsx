import { useEffect, useState } from "react";

const avatarPathPattern = /^[0-9a-f-]{36}\/avatar\.(?:jpg|png|webp)$/i;

function getAvatarUrl(path: string | null | undefined) {
  const configuredUrl = import.meta.env["VITE_SUPABASE_URL"];
  if (!configuredUrl || !path || !avatarPathPattern.test(path)) return null;

  try {
    const baseUrl = new URL(configuredUrl);
    if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") return null;
    baseUrl.pathname = `${baseUrl.pathname.replace(/\/+$/, "")}/`;
    baseUrl.search = "";
    baseUrl.hash = "";
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    return new URL(`storage/v1/object/public/profile-avatars/${encodedPath}`, baseUrl).toString();
  } catch {
    return null;
  }
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
  const imageUrl = getAvatarUrl(avatarPath);
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
