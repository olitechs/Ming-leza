import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { getMyAccess } from "@/lib/auth/server";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { WaitingPrompt } from "@/components/chat/WaitingPrompt";
import { ChatInput } from "@/components/chat/ChatInput";
import { BottomNav } from "@/components/layout/BottomNav";

export const Route = createFileRoute("/chat/$matchId")({
  beforeLoad: async () => {
    const access = await getMyAccess();
    if (!access.authenticated || !access.adultVerified)
      throw redirect({ to: "/login", search: { mode: "signin" } });
  },
  head: () => ({
    meta: [
      { title: "Conversation · Mingleza" },
      { name: "description", content: "A private conversation on Mingleza." },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const [messages, setMessages] = useState([
    { id: 1, mine: true, body: "Hello! How are you doing? 😊", time: "Just now" },
    { id: 2, mine: false, body: "Hi! Great) 💫", time: "30 mins" },
  ]);
  return (
    <main className="min-h-dvh bg-[#0a0a0a] pb-24 text-white">
      <section className="mx-auto flex min-h-[calc(100dvh-6rem)] max-w-2xl flex-col overflow-hidden border-x border-white/5 bg-[#111113]">
        <ChatHeader />
        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-6">
          <WaitingPrompt />
          {messages.map((message) => (
            <ChatBubble
              key={message.id}
              message={message.body}
              mine={message.mine}
              time={message.time}
            />
          ))}
        </div>
        <ChatInput
          onSend={(body) =>
            setMessages((current) => [
              ...current,
              { id: Date.now(), mine: true, body, time: "Just now" },
            ])
          }
        />
        <p className="px-4 pb-3 text-center text-[10px] text-[#8e8e93]">
          Chat UI preview. Messages in this preview are not saved or delivered.
        </p>
      </section>
      <BottomNav />
    </main>
  );
}
