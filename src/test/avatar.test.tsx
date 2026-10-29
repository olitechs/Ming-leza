import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Avatar } from "@/components/Avatar";

const { createSignedUrl } = vi.hoisted(() => ({
  createSignedUrl: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({
    storage: {
      from: () => ({ createSignedUrl }),
    },
  }),
}));

describe("Avatar private image delivery", () => {
  beforeEach(() => {
    createSignedUrl.mockReset();
    createSignedUrl.mockResolvedValue({
      data: {
        signedUrl:
          "https://supabase.example/storage/v1/object/sign/profile-avatars/avatar?token=short-lived",
      },
      error: null,
    });
  });

  it("renders an authorized short-lived signed URL for a valid existing avatar path", async () => {
    render(
      <Avatar name="Test Member" avatarPath="10000000-0000-4000-8000-000000000001/avatar.jpg" />,
    );

    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Test Member's profile photo" }).querySelector("img"))
        .toHaveAttribute("src", expect.stringContaining("/object/sign/"));
    });
    expect(createSignedUrl).toHaveBeenCalledWith(
      "10000000-0000-4000-8000-000000000001/avatar.jpg",
      60,
    );
  });

  it("does not request a signed URL for an invalid object path", () => {
    render(<Avatar name="Test Member" avatarPath="../someone-else/avatar.jpg" />);

    expect(createSignedUrl).not.toHaveBeenCalled();
    expect(screen.getByRole("img", { name: "Test Member's profile photo" })).toHaveTextContent(
      "TM",
    );
  });

  it("falls back to initials when storage refuses to sign the avatar", async () => {
    createSignedUrl.mockResolvedValue({ data: null, error: { message: "not authorized" } });

    render(<Avatar name="Test Member" avatarPath="10000000-0000-4000-8000-000000000001/avatar.jpg" />);

    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Test Member's profile photo" })).toHaveTextContent(
        "TM",
      );
    });
    expect(
      screen
        .getByRole("img", { name: "Test Member's profile photo" })
        .querySelector("img"),
    ).not.toBeInTheDocument();
  });
});
