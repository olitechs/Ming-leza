import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export function normalizeSiteUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * SITE_URL is the canonical production origin. When it is not configured (such as in a preview),
 * derive metadata URLs from the current request rather than silently omitting canonical URLs.
 */
export const getPublicSiteUrl = createServerFn({ method: "GET" }).handler(() => {
  const configured = normalizeSiteUrl(process.env["SITE_URL"]);
  if (configured) return configured;
  try {
    return normalizeSiteUrl(new URL(getRequest().url).origin);
  } catch {
    return null;
  }
});

const publicPaths = ["/", "/terms", "/privacy", "/faq"] as const;

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function buildSitemapXml(siteUrl: string): string {
  const urls = publicPaths
    .map((path) => {
      const loc = `${siteUrl}${path === "/" ? "/" : path}`;
      return `  <url><loc>${escapeXml(loc)}</loc></url>`;
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
    "",
  ].join("\n");
}

export function buildRobotsTxt(siteUrl: string | null): string {
  const lines = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /auth-callback",
    "Disallow: /explore",
    "Disallow: /login",
    "Disallow: /matches",
    "Disallow: /messages",
    "Disallow: /profile-edit",
    "Disallow: /u/",
    "Disallow: /welcome",
  ];
  if (siteUrl) lines.push("", `Sitemap: ${siteUrl}/sitemap.xml`);
  return `${lines.join("\n")}\n`;
}

export function getHomeHead(page: "marketing" | "discover", siteUrl: string | null) {
  if (page === "discover") {
    return {
      meta: [
        { title: "Discover · Mingleza" },
        { name: "description", content: "Your Mingleza discovery space." },
        { name: "robots", content: "noindex,nofollow" },
      ],
    };
  }

  const title = "Mingleza | Meet friends and dates across Kenya";
  const description =
    "Find friendship or dating in Kenya with Mingleza. Email-and-password sign-in, adult verification, and profiles for people 18+.";
  const homeUrl = siteUrl ? `${siteUrl}/` : undefined;
  const imageUrl = siteUrl ? `${siteUrl}/og-mingleza.png` : undefined;
  const websiteData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Mingleza",
    ...(homeUrl ? { url: homeUrl } : {}),
    description,
    inLanguage: "en-KE",
  };

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "theme-color", content: "#FF4A6E" },
      { name: "robots", content: "index,follow" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Meet your people in Kenya | Mingleza" },
      { property: "og:description", content: description },
      ...(homeUrl ? [{ property: "og:url", content: homeUrl }] : []),
      ...(imageUrl
        ? [
            { property: "og:image", content: imageUrl },
            { property: "og:image:width", content: "1200" },
            { property: "og:image:height", content: "630" },
          ]
        : []),
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Meet your people in Kenya | Mingleza" },
      { name: "twitter:description", content: description },
      ...(imageUrl ? [{ name: "twitter:image", content: imageUrl } : []),
    ],
    links: homeUrl ? [{ rel: "canonical", href: homeUrl }] : [],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(websiteData) }],
  };
}

export function getLegalPageHead({
  title,
  description,
  path,
  siteUrl,
}: {
  title: string;
  description: string;
  path: "/terms" | "/privacy";
  siteUrl: string | null;
}) {
  const canonicalUrl = siteUrl ? `${siteUrl}${path}` : undefined;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "theme-color", content: "#FF4A6E" },
      { name: "robots", content: "index,follow" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      ...(canonicalUrl ? [{ property: "og:url", content: canonicalUrl }] : []),
    ],
    links: canonicalUrl ? [{ rel: "canonical", href: canonicalUrl }] : [],
  };
}
