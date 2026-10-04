import type { ChatRedirect } from "@/lib/api/types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  redirect?: ChatRedirect | null;
}

export interface StoredChat {
  conversationId: string;
  messages: ChatMessage[];
}

const MAX_STORED_MESSAGES = 60;

/**
 * Chats are kept in sessionStorage (this browser tab only, gone when the tab
 * closes) under a key that includes the authenticated user's id, so one
 * user's conversation can never be shown to another user on the same
 * device. Nothing is stored on the server.
 */
function key(userId: string): string {
  return `ss_ai_chat:${userId}`;
}

export function newConversationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function loadChat(userId: string): StoredChat | null {
  try {
    const raw = window.sessionStorage.getItem(key(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredChat;
    if (!parsed || typeof parsed.conversationId !== "string" || !Array.isArray(parsed.messages)) {
      return null;
    }
    const messages = parsed.messages.filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        typeof m.id === "string"
    );
    return { conversationId: parsed.conversationId, messages };
  } catch {
    return null;
  }
}

export function saveChat(userId: string, chat: StoredChat): void {
  try {
    window.sessionStorage.setItem(
      key(userId),
      JSON.stringify({
        conversationId: chat.conversationId,
        messages: chat.messages.slice(-MAX_STORED_MESSAGES),
      })
    );
  } catch {
    /* storage unavailable or full: the chat simply won't survive a reload */
  }
}

export function clearStoredChat(userId: string): void {
  try {
    window.sessionStorage.removeItem(key(userId));
  } catch {
    /* ignore */
  }
}
