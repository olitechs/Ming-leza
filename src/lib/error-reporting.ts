export type ErrorContext = { boundary?: string };

/** Provider-neutral reporting seam. Do not log raw messages, stacks, tokens or request bodies. */
export function reportError(error: unknown, context: ErrorContext = {}): void {
  const name = error instanceof Error ? error.name : "UnknownError";
  console.error("[mingleza:error]", { name, ...context });
}
