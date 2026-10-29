import { createFileRoute } from "@tanstack/react-router";
import { PublicHomepage } from "@/components/PublicHomepage";
import { getHomeHead, getPublicSiteUrl } from "@/lib/seo";

export const Route = createFileRoute("/home")({
  loader: () => getPublicSiteUrl(),
  head: ({ loaderData }) => getHomeHead("marketing", loaderData),
  component: PublicHomepage,
});
