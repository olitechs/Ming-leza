import { createFileRoute, redirect } from "@tanstack/react-router";
import { PublicHomepage } from "@/components/PublicHomepage";
import { getMyAccess } from "@/lib/auth/server";
import { getHomeHead, getPublicSiteUrl } from "@/lib/seo";

export const Route = createFileRoute("/home")({
  beforeLoad: async () => {
    const access = await getMyAccess();
    if (access.authenticated) throw redirect({ to: "/" });
  },
  loader: () => getPublicSiteUrl(),
  head: ({ loaderData }) => getHomeHead("marketing", loaderData ?? null),
  component: PublicHomepage,
});
