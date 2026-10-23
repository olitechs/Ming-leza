import { createFileRoute } from "@tanstack/react-router";
import { PublicLegalPage } from "@/components/PublicLegalPage";
import { getLegalPageHead, getPublicSiteUrl } from "@/lib/seo";

const title = "Terms of Service | Mingleza";
const description = "Draft Mingleza terms of service, pending legal review.";

export const Route = createFileRoute("/terms")({
  loader: async () => ({ siteUrl: await getPublicSiteUrl() }),
  head: ({ loaderData }) =>
    getLegalPageHead({ title, description, path: "/terms", siteUrl: loaderData?.siteUrl ?? null }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <PublicLegalPage
      title="Terms of Service"
      summary="This is a draft landing page for Mingleza’s terms of service. The final document is still being prepared."
    />
  );
}
