export function ChatBubble({
  message,
  mine = false,
  time,
}: {
  message: string;
  mine?: boolean;
  time?: string;
}) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-3xl px-4 py-3 text-sm leading-6 ${mine ? "rounded-br-md bg-[#ff4a6e] text-white" : "rounded-bl-md bg-[#242427] text-white"}`}
      >
        {message}
        {time && (
          <p className={`mt-1 text-[10px] ${mine ? "text-white/70" : "text-[#8e8e93]"}`}>{time}</p>
        )}
      </div>
    </div>
  );
}
