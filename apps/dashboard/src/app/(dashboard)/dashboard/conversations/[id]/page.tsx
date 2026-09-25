"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Bot, User } from "lucide-react";
import { useRealtimeMessages } from "@/hooks/use-realtime-messages";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/supabase";

// Mock initial messages
const mockMessages: Message[] = [
  { id: "m1", conversation_id: "c1", role: "bot", content: "Hi! I'm here to help you find the right plan. Mind if I ask a few quick questions?", created_at: new Date(Date.now() - 10 * 60000).toISOString() },
  { id: "m2", conversation_id: "c1", role: "user", content: "Sure, go ahead!", created_at: new Date(Date.now() - 9 * 60000).toISOString() },
  { id: "m3", conversation_id: "c1", role: "bot", content: "What's your monthly budget for this?", created_at: new Date(Date.now() - 9 * 60000).toISOString() },
  { id: "m4", conversation_id: "c1", role: "user", content: "$2k–$10k", created_at: new Date(Date.now() - 8 * 60000).toISOString() },
  { id: "m5", conversation_id: "c1", role: "bot", content: "Are you the decision maker?", created_at: new Date(Date.now() - 8 * 60000).toISOString() },
  { id: "m6", conversation_id: "c1", role: "user", content: "Yes", created_at: new Date(Date.now() - 7 * 60000).toISOString() },
  { id: "m7", conversation_id: "c1", role: "bot", content: "When are you looking to start?", created_at: new Date(Date.now() - 7 * 60000).toISOString() },
  { id: "m8", conversation_id: "c1", role: "user", content: "ASAP", created_at: new Date(Date.now() - 6 * 60000).toISOString() },
  { id: "m9", conversation_id: "c1", role: "bot", content: "You're a great fit! Would you like to book a 30-minute call with our team?", created_at: new Date(Date.now() - 6 * 60000).toISOString() },
  { id: "m10", conversation_id: "c1", role: "user", content: "Yes, let's do it!", created_at: new Date(Date.now() - 5 * 60000).toISOString() },
];

function MessageBubble({ message }: { message: Message }) {
  const isBot = message.role === "bot";
  return (
    <div className={cn("flex items-end gap-2", isBot ? "justify-start" : "justify-end")}>
      {isBot && (
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Bot className="h-3.5 w-3.5 text-primary" />
        </div>
      )}
      <div className={cn(
        "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm",
        isBot
          ? "bg-muted text-foreground rounded-bl-sm"
          : "bg-primary text-primary-foreground rounded-br-sm"
      )}>
        {message.content}
      </div>
      {!isBot && (
        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
          <User className="h-3.5 w-3.5" />
        </div>
      )}
    </div>
  );
}

export default function ConversationPage({ params }: { params: { id: string } }) {
  const messages = useRealtimeMessages(params.id, mockMessages);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/conversations">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Conversations
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Conversation {params.id}</h1>
            <p className="text-xs text-muted-foreground">Live transcript</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <Badge variant="success">Live</Badge>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Footer note */}
      <div className="pt-4 border-t mt-4">
        <p className="text-xs text-center text-muted-foreground">
          Read-only view — messages update in real time via Supabase Realtime
        </p>
      </div>
    </div>
  );
}
