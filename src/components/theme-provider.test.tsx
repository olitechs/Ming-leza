import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import { themeBootstrapScript } from "@/lib/theme-bootstrap";

function ThemeProbe() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <output data-testid="theme">{theme}</output>
      <output data-testid="resolved-theme">{resolvedTheme}</output>
      <button type="button" onClick={() => setTheme("dark")}>Use dark theme</button>
      <button type="button" onClick={() => setTheme("light")}>Use light theme</button>
    </div>
  );
}

describe("Mingleza theme", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.style.colorScheme = "";
  });

  it("applies a saved dark preference before React renders", () => {
    window.localStorage.setItem("mingleza-theme", "dark");
    expect(themeBootstrapScript).toContain('localStorage.getItem("mingleza-theme")');
    expect(themeBootstrapScript).toContain('root.classList.toggle("dark", resolved === "dark")');
  });

  it("restores the saved theme preference on mount", () => {
    window.localStorage.setItem("mingleza-theme", "dark");
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(document.documentElement).toHaveClass("dark");
  });

  it("persists a theme change and updates the document theme", () => {
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    act(() => fireEvent.click(screen.getByRole("button", { name: "Use dark theme" })));
    expect(window.localStorage.getItem("mingleza-theme")).toBe("dark");
    expect(document.documentElement).toHaveClass("dark");
    act(() => fireEvent.click(screen.getByRole("button", { name: "Use light theme" })));
    expect(window.localStorage.getItem("mingleza-theme")).toBe("light");
    expect(document.documentElement).toHaveClass("light");
  });
});
