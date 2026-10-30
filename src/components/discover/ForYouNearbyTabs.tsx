type Props = { value: "for-you" | "nearby"; onChange: (value: "for-you" | "nearby") => void };
export function ForYouNearbyTabs({ value, onChange }: Props) {
  return (
    <div role="tablist" aria-label="Discovery feed" className="flex gap-7 border-b border-border">
      {(
        [
          { value: "for-you", label: "For You" },
          { value: "nearby", label: "Nearby" },
        ] as const
      ).map((tab) => {
        const unavailable = tab.value === "nearby";
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={value === tab.value}
            aria-label={unavailable ? "Nearby discovery is not available yet" : tab.label}
            title={unavailable ? "Nearby discovery is not available yet" : tab.label}
            disabled={unavailable}
            onClick={() => onChange(tab.value)}
            className={`relative pb-3 text-sm font-bold transition ${value === tab.value ? "text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:rounded-full after:bg-primary" : "text-muted-foreground"} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {unavailable ? "Nearby · soon" : tab.label}
          </button>
        );
      })}
    </div>
  );
}
