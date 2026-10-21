import { createFileRoute, redirect } from "@tanstack/react-router";

// Mingleza is passwordless. Keep old /login links working by sending them to sign-in.
export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    throw redirect({
      to: "/welcome",
      search: { authComplete: false, authError: "", mode: "signin" },
    });
  },
});
