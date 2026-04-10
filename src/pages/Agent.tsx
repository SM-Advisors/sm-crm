import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Plus, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface Message {
  role: "user" | "agent";
  text: string;
}

const AGENT_SECRET = (() => {
  // We'll pass it through edge functions; the frontend just needs to auth
  // We use a hook to get it from settings or env
  return "";
})();

export default function AgentPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 50);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const getAgentSecret = async (): Promise<string> => {
    // Fetch from agent_config table or use a known value
    // For now we invoke edge functions which handle the secret server-side
    // The frontend passes auth via supabase session
    const { data } = await supabase
      .from("agent_config")
      .select("config_value")
      .eq("config_key", "agent_api_secret")
      .single();
    return (data?.config_value as { value?: string })?.value || "";
  };

  const createSession = async () => {
    setIsCreatingSession(true);
    try {
      const secret = await getAgentSecret();
      const { data, error } = await supabase.functions.invoke(
        "agent-session-create",
        {
          method: "POST",
          headers: { "x-agent-secret": secret },
          body: {},
        }
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSessionId(data.session_id);
      setMessages([]);
      return data.session_id;
    } catch (e) {
      console.error("Failed to create session:", e);
      toast.error("Failed to create agent session");
      return null;
    } finally {
      setIsCreatingSession(false);
    }
  };

  const startStream = async (sid: string, secret: string) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const url = `${supabaseUrl}/functions/v1/agent-session-stream?session_id=${encodeURIComponent(sid)}`;

      const resp = await fetch(url, {
        headers: {
          "x-agent-secret": secret,
        },
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        throw new Error("Failed to connect to stream");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let agentText = "";
      let buffer = "";

      // Add empty agent message
      setMessages((prev) => [...prev, { role: "agent", text: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === "[DONE]") continue;

          try {
            const evt = JSON.parse(raw);

            if (evt.type === "agent.message") {
              // Extract text from content blocks
              const content = evt.content || [];
              for (const block of content) {
                if (block.type === "text" && block.text) {
                  agentText += block.text;
                  const captured = agentText;
                  setMessages((prev) => {
                    const copy = [...prev];
                    copy[copy.length - 1] = { role: "agent", text: captured };
                    return copy;
                  });
                  scrollToBottom();
                }
              }
            } else if (evt.type === "agent.message_delta") {
              // Handle deltas
              if (evt.delta?.text) {
                agentText += evt.delta.text;
                const captured = agentText;
                setMessages((prev) => {
                  const copy = [...prev];
                  copy[copy.length - 1] = { role: "agent", text: captured };
                  return copy;
                });
                scrollToBottom();
              }
            } else if (evt.type === "content_block_delta") {
              if (evt.delta?.text) {
                agentText += evt.delta.text;
                const captured = agentText;
                setMessages((prev) => {
                  const copy = [...prev];
                  copy[copy.length - 1] = { role: "agent", text: captured };
                  return copy;
                });
                scrollToBottom();
              }
            } else if (evt.type === "session.status_idle") {
              // Done
              break;
            }
            // Ignore other event types
          } catch {
            // skip unparseable lines
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        console.error("Stream error:", e);
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    scrollToBottom();

    let sid = sessionId;
    if (!sid) {
      sid = await createSession();
      if (!sid) return;
    }

    const secret = await getAgentSecret();

    try {
      const { data, error } = await supabase.functions.invoke(
        "agent-session-send",
        {
          method: "POST",
          headers: { "x-agent-secret": secret },
          body: { session_id: sid, message: text },
        }
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Start streaming the response
      await startStream(sid, secret);
    } catch (e) {
      console.error("Failed to send message:", e);
      toast.error("Failed to send message");
    }
  };

  const handleNewConversation = async () => {
    if (abortRef.current) abortRef.current.abort();
    setIsStreaming(false);
    setSessionId(null);
    setMessages([]);
    await createSession();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Agent</h1>
          <p className="text-sm text-muted-foreground">
            Chat with your AI business development agent
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNewConversation}
          disabled={isCreatingSession}
        >
          <Plus size={16} className="mr-1" />
          New Conversation
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Bot size={48} className="mb-4 opacity-30" />
            <p className="text-sm">
              Start a conversation with your BD agent
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-3 max-w-[80%]",
              msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
            )}
          >
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {msg.role === "user" ? (
                <User size={16} />
              ) : (
                <Bot size={16} />
              )}
            </div>
            <div
              className={cn(
                "rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              )}
            >
              {msg.text || (isStreaming && i === messages.length - 1 ? (
                <TypingDots />
              ) : null)}
            </div>
          </div>
        ))}

        {isStreaming && messages.length > 0 && messages[messages.length - 1].text && (
          <div className="flex gap-3 mr-auto max-w-[80%]">
            <div className="w-8 h-8" />
            <TypingDots />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border pt-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isStreaming || isCreatingSession}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming || isCreatingSession}
            size="icon"
          >
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-1 items-center py-2 px-1">
      <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
      <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
      <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
    </div>
  );
}
