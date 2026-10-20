import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Send } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { byId, conversations } from "@/lib/people";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [
      { title: "Messages · Mingleza" },
      { name: "description", content: "Chat with your matches and friends on Mingleza." },
      { property: "og:title", content: "Messages · Mingleza" },
      { property: "og:description", content: "Chat with your matches and friends." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Messages,
});

function Messages() {
  const [active, setActive] = useState("wanjiru");
  const [msgs, setMsgs] = useState<Record<string, { me: boolean; text: string }[]>>({
    wanjiru: [{ me: false, text: "Hey! Saw you also love hiking 🥾" }, { me: true, text: "Yes! Karura or Ngong Hills?" }, { me: false, text: "Haha sawa, Saturday at Karura then?" }],
  });
  const [draft, setDraft] = useState("");
  const person = byId(active);
  const thread = msgs[active] ?? [{ me: false, text: conversations.find((c) => c.id === active)!.last }];

  const send = () => {
    if (!draft.trim()) return;
    setMsgs({ ...msgs, [active]: [...thread, { me: true, text: draft.trim() }] });
    setDraft("");
  };

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-5rem)] lg:h-screen">
        <section className="w-full border-r bg-card md:w-80">
          <h1 className="px-5 pb-3 pt-6 text-3xl font-extrabold">Messages</h1>
          {conversations.map((c) => {
            const p = byId(c.id);
            return (
              <button key={c.id} onClick={() => setActive(c.id)} className={`flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-muted ${active === c.id ? "bg-secondary" : ""}`}>
                <img src={p.photo} alt={p.name} className="size-12 rounded-full object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between"><span className="font-semibold">{p.name}</span><span className="text-xs text-muted-foreground">{c.time}</span></div>
                  <p className="truncate text-sm text-muted-foreground">{c.last}</p>
                </div>
                {c.unread > 0 && <span className="grid size-5 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">{c.unread}</span>}
              </button>
            );
          })}
        </section>
        <section className="hidden flex-1 flex-col md:flex">
          <header className="flex items-center gap-3 border-b bg-card px-6 py-4">
            <img src={person.photo} alt={person.name} className="size-10 rounded-full object-cover" />
            <div><p className="font-semibold">{person.name}</p><p className="text-xs text-muted-foreground">{person.online ? "Online" : person.area}</p></div>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto p-6">
            {thread.map((m, k) => (
              <div key={k} className={`flex ${m.me ? "justify-end" : ""}`}>
                <p className={`max-w-sm rounded-3xl px-4 py-2.5 text-sm ${m.me ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-card shadow-soft"}`}>{m.text}</p>
              </div>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 border-t bg-card p-4">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a message…" className="flex-1 rounded-full border bg-background px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            <button aria-label="Send" className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary-pressed"><Send className="size-5" /></button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
