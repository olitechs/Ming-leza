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
        className={`max-w-[82%] rounded-3xl px-4 py-3 text-sm leading-6 ${mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-secondary text-secondary-foreground"}`}
      >
        {message}
        {time && (
          <p className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{time}</p>
        )}
      </div>
    </div>
  );
}
