import { createFileRoute, redirect } from "@tanstack/react-router";
import { getMyAccess } from "@/lib/auth/server";
import { MotivationScreen } from "@/components/onboarding/MotivationScreen";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async () => {
    const access = await getMyAccess();
    if (access.authenticated && access.adultVerified) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Endless Motivation · Mingleza" },
      {
        name: "description",
        content: "Discover meaningful connections across Kenya with Mingleza.",
      },
    ],
  }),
  component: MotivationScreen,
});
