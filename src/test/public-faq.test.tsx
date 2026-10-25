import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicFAQPage } from "@/components/PublicFAQPage";

describe("public FAQ page", () => {
  it("contains a substantive categorized FAQ and links to the existing sign-up flow", () => {
    render(<PublicFAQPage />);

    expect(screen.getByText("41 answers across 7 topics.")).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 1, name: /frequently asked questions/i }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "About Mingleza" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Privacy, safety, and help" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Are my profile photos private?" })).toBeVisible();
    expect(screen.getByRole("link", { name: /get started/i })).toHaveAttribute("href", "/login");
    expect(
      screen
        .getAllByRole("link", { name: "Privacy" })
        .every((link) => link.getAttribute("href") === "/privacy"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: "Terms" })
        .every((link) => link.getAttribute("href") === "/terms"),
    ).toBe(true);
  });

  it("filters across questions and answers and announces the number of results", () => {
    render(<PublicFAQPage />);
    const search = screen.getByRole("searchbox", { name: "Search questions" });

    fireEvent.change(search, { target: { value: "government ID" } });
    expect(screen.getByText("1 answer match your search.")).toBeVisible();
    expect(screen.getByRole("button", { name: "How does the 18+ check work?" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "About Mingleza" })).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: "no-such-feature" } });
    expect(screen.getByRole("status")).toHaveTextContent("No matching questions");
  });

  it("uses an accessible accordion control to reveal the full answer", () => {
    render(<PublicFAQPage />);
    const question = screen.getByRole("button", { name: "How does the 18+ check work?" });
    expect(question).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(question);
    expect(question).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText(/self-attestation; it does not verify a government ID or use biometrics/i),
    ).toBeVisible();
  });
});
