import { useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type RealtimeMessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type RealtimeMessage = RealtimeMessageRow & { mine: boolean };

type Options = {
  conversationId: string | null | undefined;
  table: "messages" | "dating_messages";
  onMessage: (message: RealtimeMessage) => void;
};

/**
 * Listen for newly inserted messages for one already-authorized conversation.
 * Postgres Changes applies the table's RLS policies; the server functions remain
 * the authority for opening conversations and sending messages.
 */
export function useRealtimeConversationMessages({ conversationId, table, onMessage }: Options) {
  useEffect(() => {
    if (!conversationId) return;

    let disposed = false;
    let userId: string | null = null;
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`conversation-messages:${table}:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table,
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          if (disposed) return;
          const row = payload.new as unknown as RealtimeMessageRow;
          if (
            !row ||
            typeof row.id !== "string" ||
            row.conversation_id !== conversationId ||
            typeof row.sender_id !== "string" ||
            typeof row.body !== "string" ||
            typeof row.created_at !== "string"
          )
            return;
          onMessage({ ...row, mine: row.sender_id === userId });
        },
      )
      .subscribe();

    void supabase.auth
      .getUser()
      .then((result: { data: { user: { id: string } | null } }) => {
        if (!disposed) userId = result.data.user?.id ?? null;
      });

    return () => {
      disposed = true;
      void supabase.removeChannel(channel);
    };
  }, [conversationId, table, onMessage]);
}
