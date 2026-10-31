export const themeBootstrapScript = `
  try {
    const saved = localStorage.getItem("mingleza-theme");
    const theme =
      saved === "dark" || saved === "light" || saved === "system" ? saved : "light";
    const resolved =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.classList.toggle("light", resolved === "light");
    root.style.colorScheme = resolved;
  } catch {
    document.documentElement.classList.add("light");
    document.documentElement.style.colorScheme = "light";
  }
`;
