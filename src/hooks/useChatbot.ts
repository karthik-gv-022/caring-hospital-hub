import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  error?: boolean;
  actions?: ChatAction[];
}

export interface ChatAction {
  label: string;
  action: string;
  data?: Record<string, unknown>;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hospital-chatbot`;

export function useChatbot(patientId?: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const sendMessage = useCallback(async (input: string, imageBase64?: string) => {
    const userMsg: ChatMessage = { 
      role: "user", 
      content: input,
      imageUrl: imageBase64
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    let assistantContent = "";

    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      
      // Parse actions from content if present
      let actions: ChatAction[] | undefined;
      let displayContent = assistantContent;
      
      // Look for action markers in the content
      const actionMatches = assistantContent.match(/\[ACTION:([^\]]+)\]/g);
      if (actionMatches) {
        actions = actionMatches.map(match => {
          const actionStr = match.replace(/\[ACTION:|]/g, '');
          const [label, action, ...dataParts] = actionStr.split('|');
          return {
            label: label.trim(),
            action: action.trim(),
            data: dataParts.length ? JSON.parse(dataParts.join('|')) : undefined
          };
        });
        displayContent = assistantContent.replace(/\[ACTION:[^\]]+\]/g, '').trim();
      }
      
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: displayContent, actions } : m
          );
        }
        return [...prev, { role: "assistant", content: displayContent, actions }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({
            role: m.role,
            content: m.imageUrl 
              ? [
                  { type: "text", text: m.content },
                  { type: "image_url", image_url: { url: m.imageUrl } }
                ]
              : m.content
          })),
          patientId,
          userId: user?.id,
          hasImage: !!imageBase64,
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.error || "Failed to get response");
      }

      if (!resp.body) {
        throw new Error("No response body");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) updateAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) updateAssistant(content);
          } catch {
            /* ignore */
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Chat Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
      // Mark the message as failed instead of removing
      setMessages((prev) => 
        prev.map((m, i) => 
          i === prev.length - 1 && m.role === "user" 
            ? { ...m, error: true } 
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [messages, patientId, user, toast]);

  const retryMessage = useCallback((messageIndex: number) => {
    const msg = messages[messageIndex];
    if (msg && msg.role === "user" && msg.error) {
      // Remove the failed message
      setMessages((prev) => prev.filter((_, i) => i !== messageIndex));
      // Resend
      sendMessage(msg.content, msg.imageUrl);
    }
  }, [messages, sendMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    retryMessage,
  };
}
