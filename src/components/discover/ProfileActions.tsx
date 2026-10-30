import { Heart, MessageCircle, X } from "lucide-react";
type Props = {
  onPass: () => void;
  onLike: () => void;
  onMessage: () => void;
  disabled?: boolean;
  passLabel?: string;
  likeLabel?: string;
};
export function ProfileActions({
  onPass,
  onLike,
  onMessage,
  disabled = false,
  passLabel = "Pass profile",
  likeLabel = "Like profile",
}: Props) {
  return (
    <div className="flex items-center justify-center gap-5">
      <button
        type="button"
        aria-label={passLabel}
        disabled={disabled}
        onClick={onPass}
        className="grid size-14 place-items-center rounded-full border border-border bg-secondary text-secondary-foreground shadow-xl transition hover:-translate-y-1 hover:text-primary disabled:opacity-50"
      >
        <X className="size-6" />
      </button>
      <button
        type="button"
        aria-label={likeLabel}
        disabled={disabled}
        onClick={onLike}
        className="grid size-[4.25rem] place-items-center rounded-full bg-primary text-primary-foreground shadow-card transition hover:-translate-y-1 hover:brightness-95 disabled:opacity-50"
      >
        <Heart className="size-8 fill-current" />
      </button>
      <button
        type="button"
        aria-label="Message profile"
        onClick={onMessage}
        className="grid size-14 place-items-center rounded-full border border-border bg-secondary text-secondary-foreground shadow-xl transition hover:-translate-y-1 hover:text-primary"
      >
        <MessageCircle className="size-6" />
      </button>
    </div>
  );
}
