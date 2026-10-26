import { createFileRoute, redirect } from "@tanstack/react-router";

// Keep legacy /login links working by sending them to password sign-in.
export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    throw redirect({
      to: "/welcome",
      search: { authComplete: false, authError: "", mode: "signin" },
    });
  },
});
