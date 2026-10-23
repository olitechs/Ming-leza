import { createFileRoute } from "@tanstack/react-router";
import { buildSitemapXml, normalizeSiteUrl } from "@/lib/seo";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const siteUrl = normalizeSiteUrl(process.env["SITE_URL"]);
        if (!siteUrl) {
          return new Response("Set SITE_URL to enable the public sitemap.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }
        return new Response(buildSitemapXml(siteUrl), {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
