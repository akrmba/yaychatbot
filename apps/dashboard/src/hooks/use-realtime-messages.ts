"use client";

import { useEffect, useState, useRef } from "react";
import { supabase, type Message } from "@/lib/supabase";

export function useRealtimeMessages(conversationId: string, initial: Message[] = []) {
  const [messages, setMessages] = useState<Message[]>(initial);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    // Load existing messages
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data as Message[]);
      });

    // Subscribe to new messages
    channelRef.current = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [conversationId]);

  return messages;
}
