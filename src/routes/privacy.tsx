import { createFileRoute } from "@tanstack/react-router";
import { PublicLegalPage } from "@/components/PublicLegalPage";
import { getLegalPageHead, getPublicSiteUrl } from "@/lib/seo";

const title = "Privacy Policy | Mingleza";
const description = "Draft Mingleza privacy policy, pending legal review.";

export const Route = createFileRoute("/privacy")({
  loader: async () => ({ siteUrl: await getPublicSiteUrl() }),
  head: ({ loaderData }) =>
    getLegalPageHead({
      title,
      description,
      path: "/privacy",
      siteUrl: loaderData?.siteUrl ?? null,
    }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <PublicLegalPage
      title="Privacy Policy"
      summary="This is a draft landing page for Mingleza’s privacy policy. The final document is still being prepared."
    />
  );
}
