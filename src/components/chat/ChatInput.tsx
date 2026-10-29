import { Paperclip, Send, Smile } from "lucide-react";
import { useState, type FormEvent } from "react";
export function ChatInput({ onSend }: { onSend: (message: string) => void }) {
  const [draft, setDraft] = useState("");
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const message = draft.trim(); if (!message) return; onSend(message); setDraft(""); };
  return <form onSubmit={submit} className="flex items-center gap-2 border-t border-white/10 bg-[#111113] p-3 sm:p-4"><button type="button" aria-label="Attach file" className="grid size-9 shrink-0 place-items-center rounded-full text-[#8e8e93] hover:bg-white/10"><Paperclip className="size-5" /></button><div className="flex min-w-0 flex-1 items-center rounded-full bg-[#1c1c1e] px-4"><input value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Write your message" placeholder="Write your message here" className="min-w-0 flex-1 bg-transparent py-3 text-sm text-white outline-none placeholder:text-[#8e8e93]" /><button type="button" aria-label="Emoji" className="ml-2 text-[#8e8e93]"><Smile className="size-5" /></button></div><button type="submit" aria-label="Send message" disabled={!draft.trim()} className="grid size-11 shrink-0 place-items-center rounded-full bg-[#ff4a6e] text-white disabled:opacity-40"><Send className="size-4" /></button></form>;
}
