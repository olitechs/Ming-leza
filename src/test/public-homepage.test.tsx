import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicHomepage } from "@/components/PublicHomepage";
import { getHomePageMode } from "@/lib/homepage-routing";
import { buildRobotsTxt, buildSitemapXml, normalizeSiteUrl } from "@/lib/seo";

describe("public homepage", () => {
  it("selects the marketing experience for logged-out visitors and preserves Discover for verified members", () => {
    expect(getHomePageMode({ authenticated: false, adultVerified: false })).toBe("marketing");
    expect(getHomePageMode({ authenticated: true, adultVerified: true })).toBe("discover");
    expect(getHomePageMode({ authenticated: true, adultVerified: false })).toBe("onboarding");
  });

  it("renders the public landing page without collecting sign-in details", () => {
    expect(getHomePageMode({ authenticated: false, adultVerified: false })).toBe("marketing");
    render(<PublicHomepage />);

    expect(
      screen.getByRole("heading", { level: 1, name: /meet your people in kenya/i }),
    ).toBeInTheDocument();
    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(screen.queryByLabelText(/phone number|email address/i)).not.toBeInTheDocument();
  });

  it("routes all sign-up and log-in calls to the existing passwordless flow", () => {
    render(<PublicHomepage />);

    const signUpLinks = screen.getAllByRole("link", { name: "Sign up free" });
    expect(signUpLinks.length).toBeGreaterThanOrEqual(2);
    expect(signUpLinks.every((link) => link.getAttribute("href") === "/welcome")).toBe(true);

    const logInLinks = screen.getAllByRole("link", { name: "Log in" });
    expect(logInLinks.length).toBeGreaterThanOrEqual(2);
    expect(logInLinks.every((link) => link.getAttribute("href") === "/welcome?mode=signin")).toBe(
      true,
    );
    expect(
      screen.getByRole("link", { name: "Create your free account" }).getAttribute("href"),
    ).toBe("/welcome");
    expect(
      screen.getByRole("link", { name: "Read all frequently asked questions" }),
    ).toHaveAttribute("href", "/faq");
  });

  it("exposes a labeled, keyboard-operable mobile navigation toggle", () => {
    render(<PublicHomepage />);
    const openButton = screen.getByRole("button", { name: "Open navigation menu" });
    expect(openButton).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(openButton);

    const closeButton = screen.getByRole("button", { name: "Close navigation menu" });
    expect(closeButton).toHaveAttribute("aria-expanded", "true");
    expect(
      within(screen.getByRole("navigation", { name: "Mobile navigation" })).getByRole("link", {
        name: "How it works",
      }),
    ).toHaveAttribute("href", "#how-it-works");
  });
});

describe("public SEO routes", () => {
  it("normalizes SITE_URL to a safe origin and rejects invalid protocols", () => {
    expect(normalizeSiteUrl("https://mingleza.example/path/")).toBe("https://mingleza.example");
    expect(normalizeSiteUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeSiteUrl(undefined)).toBeNull();
  });

  it("lists only the public homepage, FAQ, and legal draft pages in the sitemap", () => {
    const xml = buildSitemapXml("https://mingleza.example");
    expect(xml).toContain("https://mingleza.example/");
    expect(xml).toContain("https://mingleza.example/terms");
    expect(xml).toContain("https://mingleza.example/privacy");
    expect(xml).toContain("https://mingleza.example/faq");
    expect(xml).not.toContain("/welcome");
    expect(xml).not.toContain("/u/");
  });

  it("points crawlers at the configured sitemap and disallows app-only routes", () => {
    const robots = buildRobotsTxt("https://mingleza.example");
    expect(robots).toContain("Sitemap: https://mingleza.example/sitemap.xml");
    expect(robots).toContain("Disallow: /welcome");
    expect(robots).toContain("Disallow: /u/");
    expect(buildRobotsTxt(null)).not.toContain("Sitemap:");
  });
});
