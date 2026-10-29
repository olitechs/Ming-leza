import { Link } from "@tanstack/react-router";

export function MinglezaLogo({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/home"
      aria-label="Mingleza home"
      className={`inline-flex items-baseline font-display text-2xl font-extrabold tracking-tight text-foreground ${className}`}
    >
      mingleza<span aria-hidden="true" className="text-primary dark:text-violet-400">.</span>
    </Link>
  );
}
