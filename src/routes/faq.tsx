import { createFileRoute } from "@tanstack/react-router";
import { PublicFAQPage } from "@/components/PublicFAQPage";
import { getPublicSiteUrl } from "@/lib/seo";

export const Route = createFileRoute("/faq")({
  loader: () => getPublicSiteUrl(),
  head: ({ loaderData }) => {
    const siteUrl = loaderData;
    const url = siteUrl ? `${siteUrl}/faq` : undefined;
    const imageUrl = siteUrl ? `${siteUrl}/og-mingleza.png` : undefined;
    const title = "Frequently asked questions · Mingleza";
    const description =
      "Learn how Mingleza sign-in, adult verification, profiles, friendship, messages, and current limitations work.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "theme-color", content: "#6C47FF" },
        { name: "robots", content: "index,follow" },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "Mingleza" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        ...(url ? [{ property: "og:url", content: url }] : []),
        ...(imageUrl ? [{ property: "og:image", content: imageUrl }] : []),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        ...(imageUrl ? [{ name: "twitter:image", content: imageUrl }] : []),
      ],
      links: url ? [{ rel: "canonical", href: url }] : [],
    };
  },
  component: PublicFAQPage,
});
