type Props = { value: "for-you" | "nearby"; onChange: (value: "for-you" | "nearby") => void };
export function ForYouNearbyTabs({ value, onChange }: Props) {
  return (
    <div role="tablist" aria-label="Discovery feed" className="flex gap-7 border-b border-border">
      {(
        [
          { value: "for-you", label: "For You" },
          { value: "nearby", label: "Nearby" },
        ] as const
      ).map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          aria-label={tab.value === "nearby" ? "Nearby discovery coming soon" : tab.label}
          disabled={tab.value === "nearby"}
          onClick={() => onChange(tab.value)}
          className={`relative pb-3 text-sm font-bold transition ${value === tab.value ? "text-white after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:rounded-full after:bg-[#ff4a6e]" : "text-[#8e8e93]"} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {tab.value === "nearby" ? "Nearby · soon" : tab.label}
        </button>
      ))}
    </div>
  );
}
