import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Search, Send } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { byId, conversations, people } from "@/lib/people";
import { getMyAccess } from "@/lib/auth/server";

export const Route = createFileRoute("/messages")({
  beforeLoad: async () => {
    const access = await getMyAccess();
    if (!access.authenticated || !access.adultVerified) throw redirect({ to: "/welcome" });
  },
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

type Msg = { me: boolean; text: string };

function Messages() {
  const [active, setActive] = useState("wanjiru");
  const [openMobile, setOpenMobile] = useState(false);
  const [msgs, setMsgs] = useState<Record<string, Msg[]>>({
    wanjiru: [
      { me: false, text: "Hey! Saw you also love hiking 🥾" },
      { me: true, text: "Yes! Karura or Ngong Hills?" },
      { me: false, text: "Haha sawa, Saturday at Karura then?" },
    ],
  });
  const [draft, setDraft] = useState("");
  const person = byId(active)!;
  const thread = msgs[active] ?? [
    { me: false, text: conversations.find((c) => c.id === active)?.last ?? "Say hi 👋" },
  ];

  const send = () => {
    if (!draft.trim()) return;
    setMsgs({ ...msgs, [active]: [...thread, { me: true, text: draft.trim() }] });
    setDraft("");
  };
  const open = (id: string) => {
    setActive(id);
    setOpenMobile(true);
  };

  return (
    <AppShell hideTabs={openMobile}>
      <div className="flex h-[calc(100vh-7rem)] md:h-[calc(100vh-7rem)] lg:h-screen">
        <section
          className={`w-full flex-col bg-card md:flex md:w-80 md:border-r ${openMobile ? "hidden" : "flex"}`}
        >
          <div className="rounded-b-[28px] bg-primary px-5 pb-5 pt-6 text-primary-foreground md:rounded-none">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-extrabold">Chat</h1>
              <Search className="size-5" />
            </div>
            <div className="mt-4 flex gap-4 overflow-x-auto">
              {people
                .filter((p) => p.online)
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => open(p.id)}
                    className="flex shrink-0 flex-col items-center gap-1 text-xs"
                  >
                    <span className="relative">
                      <img
                        src={p.photo}
                        alt=""
                        className="size-14 rounded-full border-2 border-primary-foreground object-cover"
                      />
                      <span className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-primary bg-success" />
                    </span>
                    {p.name}
                  </button>
                ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {conversations.map((c) => {
              const p = byId(c.id)!;
              return (
                <button
                  key={c.id}
                  onClick={() => open(c.id)}
                  className={`flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-muted ${active === c.id ? "md:bg-secondary" : ""}`}
                >
                  <img src={p.photo} alt={p.name} className="size-12 rounded-full object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between">
                      <span className="font-semibold">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{c.time}</span>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{c.last}</p>
                  </div>
                  {c.unread > 0 && (
                    <span className="grid size-5 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                      {c.unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
        <section
          className={`flex-1 flex-col md:flex ${openMobile ? "flex" : "hidden"} ${openMobile ? "fixed inset-0 z-30 bg-background md:static" : ""}`}
        >
          <header className="flex items-center gap-3 bg-primary px-4 py-4 text-primary-foreground md:bg-card md:text-foreground md:border-b">
            <button onClick={() => setOpenMobile(false)} aria-label="Back" className="md:hidden">
              <ArrowLeft className="size-5" />
            </button>
            <Link to="/u/$id" params={{ id: person.id }} className="flex items-center gap-3">
              <img
                src={person.photo}
                alt={person.name}
                className="size-10 rounded-full object-cover"
              />
              <div>
                <p className="font-semibold">{person.name}</p>
                <p className="text-xs opacity-80">{person.online ? "Online" : person.area}</p>
              </div>
            </Link>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Today
            </p>
            {thread.map((m, k) => (
              <div key={k} className={`flex items-end gap-2 ${m.me ? "justify-end" : ""}`}>
                {!m.me && (
                  <img src={person.photo} alt="" className="size-7 rounded-full object-cover" />
                )}
                <p
                  className={`max-w-xs rounded-3xl px-4 py-2.5 text-sm ${m.me ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-card shadow-soft"}`}
                >
                  {m.text}
                </p>
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex gap-2 border-t bg-card p-4"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message here…"
              className="flex-1 rounded-full border bg-background px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              aria-label="Send"
              className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary-pressed"
            >
              <Send className="size-5" />
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
