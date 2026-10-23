import { createFileRoute } from "@tanstack/react-router";
import { buildRobotsTxt, normalizeSiteUrl } from "@/lib/seo";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        const siteUrl = normalizeSiteUrl(process.env["SITE_URL"]);
        return new Response(buildRobotsTxt(siteUrl), {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
