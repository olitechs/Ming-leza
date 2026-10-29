import { Heart, MessageCircle, X } from "lucide-react";
type Props = { onPass: () => void; onLike: () => void; onMessage: () => void; disabled?: boolean };
export function ProfileActions({ onPass, onLike, onMessage, disabled = false }: Props) {
  return (
    <div className="flex items-center justify-center gap-5">
      <button
        type="button"
        aria-label="Pass profile"
        disabled={disabled}
        onClick={onPass}
        className="grid size-14 place-items-center rounded-full border border-white/10 bg-[#1c1c1e] text-white shadow-xl transition hover:-translate-y-1 hover:text-[#ff5a5f] disabled:opacity-50"
      >
        <X className="size-6" />
      </button>
      <button
        type="button"
        aria-label="Like profile"
        disabled={disabled}
        onClick={onLike}
        className="grid size-[4.25rem] place-items-center rounded-full bg-[#ff4a6e] text-white shadow-[0_10px_35px_-10px_#ff4a6e99] transition hover:-translate-y-1 hover:bg-[#ff5a5f] disabled:opacity-50"
      >
        <Heart className="size-8 fill-current" />
      </button>
      <button
        type="button"
        aria-label="Message profile"
        onClick={onMessage}
        className="grid size-14 place-items-center rounded-full border border-white/10 bg-[#1c1c1e] text-white shadow-xl transition hover:-translate-y-1"
      >
        <MessageCircle className="size-6" />
      </button>
    </div>
  );
}
