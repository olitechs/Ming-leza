export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load · Mingleza</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <style>
      @font-face { font-family: "Manrope"; src: url("/fonts/manrope-latin.woff2") format("woff2"); font-style: normal; font-weight: 200 800; font-display: swap; }
      @font-face { font-family: "Sora"; src: url("/fonts/sora-latin.woff2") format("woff2"); font-style: normal; font-weight: 100 800; font-display: swap; }
      :root { color-scheme: light; font-family: "Manrope", ui-sans-serif, system-ui, sans-serif; color: #14121f; background: #faf9ff; }
      * { box-sizing: border-box; }
      body { display: grid; place-items: center; min-height: 100dvh; margin: 0; padding: calc(1.5rem + env(safe-area-inset-top)) calc(1rem + env(safe-area-inset-right)) calc(1.5rem + env(safe-area-inset-bottom)) calc(1rem + env(safe-area-inset-left)); }
      main { width: min(100%, 28rem); padding: 2rem; border: 1px solid #ece9f5; border-radius: 1.5rem; background: #fff; text-align: center; box-shadow: 0 24px 60px -24px rgb(82 51 224 / 35%); }
      .brand { margin: 0 0 1rem; color: #6c47ff; font: 700 0.875rem/1.4 "Sora", ui-sans-serif, system-ui, sans-serif; }
      h1 { margin: 0; font: 800 1.5rem/1.2 "Sora", ui-sans-serif, system-ui, sans-serif; letter-spacing: -0.02em; }
      p { margin: 0.75rem 0 0; color: #514f5c; line-height: 1.5; }
      .actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.75rem; margin-top: 1.5rem; }
      a, button { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; padding: 0.625rem 1.125rem; border: 1px solid transparent; border-radius: 999px; font: inherit; font-size: 0.9375rem; font-weight: 600; line-height: 1.4; cursor: pointer; text-decoration: none; }
      a:focus-visible, button:focus-visible { outline: 2px solid #6c47ff; outline-offset: 3px; }
      .primary { background: #6c47ff; color: #fff; }
      .secondary { border-color: #e3e0ea; background: #fff; color: #14121f; }
      @media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
    </style>
  </head>
  <body>
    <main>
      <p class="brand">Mingleza</p>
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try again or head back home.</p>
      <div class="actions">
        <button class="primary" type="button" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </main>
  </body>
</html>`;
}
