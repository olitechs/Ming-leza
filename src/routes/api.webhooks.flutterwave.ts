import { createFileRoute } from "@tanstack/react-router";
import { handleFlutterwaveWebhook } from "@/lib/premium/server";

export const Route = createFileRoute("/api/webhooks/flutterwave")({
  server: {
    handlers: {
      POST: async ({ request }) => handleFlutterwaveWebhook(request),
    },
  },
});
