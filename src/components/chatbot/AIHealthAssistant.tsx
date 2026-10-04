"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, Loader2, Mic, MicOff, Plus, Send, Trash2, User as UserIcon, ArrowRight } from "lucide-react";
import { DisclaimerCard } from "@/components/shared/DisclaimerCard";
import { chatbotApi, ApiError } from "@/lib/api/client";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useLanguage } from "@/lib/i18n/languageContext";
import { useSpeechRecognition } from "@/lib/speech/useSpeechRecognition";
import {
  clearStoredChat,
  loadChat,
  newConversationId,
  saveChat,
  type ChatMessage,
} from "@/lib/chatbot/storage";

const MAX_INPUT_CHARS = 6000;
const HISTORY_TURNS_SENT = 24;

const DISCLAIMER_TEXT =
  "AI Health Assistant provides general health information for educational purposes. It does not diagnose conditions or replace professional medical advice. In an emergency, use Emergency Help or call 108.";

const STARTER_PROMPTS = [
  "What is diabetes?",
  "Explain BP simply",
  "What is a balanced diet?",
  "Explain anemia",
  "Give me a health myth",
] as const;

/** Follow-up shortcuts; they continue the current conversation. */
const QUICK_ACTIONS: ReadonlyArray<{ label: string; prompt: string }> = [
  { label: "Explain Simply", prompt: "Please explain that again in very simple words." },
  { label: "Hindi", prompt: "Please explain the above in Hindi." },
  { label: "Give Example", prompt: "Please give a simple example." },
  { label: "Step by step", prompt: "Please explain that step by step." },
];

function friendlyError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "DEMO_READ_ONLY") return err.message;
    if (err.status === 429) return "You are sending messages too quickly. Please wait a moment and try again.";
    if (err.status === 0) return "Network problem. Please check your connection and try again.";
    if (err.status === 401) return "Your session has expired. Please sign in again.";
  }
  return "Sorry, I'm unable to respond right now. Please try again.";
}

/** Minimal, safe rendering: **bold** and "* "/"- " bullets. No raw HTML. */
function FormattedText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => {
        const bullet = /^\s*[*-]\s+(.*)$/.exec(line);
        const content = bullet ? bullet[1] : line;
        const parts = content.split(/\*\*(.+?)\*\*/g).map((part, j) =>
          j % 2 === 1 ? <strong key={j}>{part}</strong> : <React.Fragment key={j}>{part}</React.Fragment>
        );
        return (
          <p key={i} className={bullet ? "pl-4 -indent-3" : line.trim() === "" ? "h-2" : ""}>
            {bullet && <span aria-hidden="true">• </span>}
            {parts}
          </p>
        );
      })}
    </>
  );
}

export function AIHealthAssistant() {
  const { language } = useLanguage();
  const user = useCurrentUser();
  const userId = user?.id ?? null;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string>("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; retryText: string } | null>(null);
  const [ready, setReady] = useState(false);

  const inputRef = useRef("");
  inputRef.current = input;
  const loadingRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;
  const conversationIdRef = useRef("");
  conversationIdRef.current = conversationId;
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Restore THIS user's conversation only, once their identity is known.
  useEffect(() => {
    if (!userId) return;
    const stored = loadChat(userId);
    setMessages(stored?.messages ?? []);
    setConversationId(stored?.conversationId ?? newConversationId());
    setReady(true);
  }, [userId]);

  // Persist after every change (never before the user's own chat was loaded).
  useEffect(() => {
    if (!userId || !ready || !conversationId) return;
    saveChat(userId, { conversationId, messages });
  }, [userId, ready, conversationId, messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, error]);

  const { isRecording, speechError, start, stop } = useSpeechRecognition({
    language,
    getText: () => inputRef.current,
    onText: (text) => setInput(text.slice(0, MAX_INPUT_CHARS)),
  });

  const send = useCallback(
    async (rawText: string, isRetry = false) => {
      const text = rawText.trim();
      if (!text || loadingRef.current || !ready) return;
      if (isRecording) stop();

      const current = messagesRef.current;
      const history = (isRetry ? current.slice(0, -1) : current)
        .slice(-HISTORY_TURNS_SENT)
        .map((m) => ({ role: m.role, content: m.content }));

      if (!isRetry) {
        setMessages((prev) => [
          ...prev,
          { id: `${Date.now()}-u`, role: "user", content: text },
        ]);
        setInput("");
      }
      setError(null);
      loadingRef.current = true;
      setLoading(true);
      try {
        const res = await chatbotApi.chat({
          message: text,
          conversation_id: conversationIdRef.current,
          history,
          ui_language: language,
        });
        setMessages((prev) => [
          ...prev,
          { id: `${Date.now()}-a`, role: "assistant", content: res.response, redirect: res.redirect },
        ]);
      } catch (err) {
        setError({ message: friendlyError(err), retryText: text });
      } finally {
        loadingRef.current = false;
        setLoading(false);
        textareaRef.current?.focus();
      }
    },
    [isRecording, language, ready, stop]
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  const newChat = () => {
    if (isRecording) stop();
    setMessages([]);
    setError(null);
    setInput("");
    setConversationId(newConversationId());
  };

  const clearChat = () => {
    if (isRecording) stop();
    setMessages([]);
    setError(null);
    setInput("");
    if (userId) clearStoredChat(userId);
  };

  const lastMessage = messages[messages.length - 1];
  const showQuickActions =
    !loading && !error && lastMessage?.role === "assistant" && !lastMessage.redirect;
  const started = messages.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <DisclaimerCard variant="info" compact text={DISCLAIMER_TEXT} />

      <section
        aria-label="AI Health Assistant chat"
        className="flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden"
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700">
              <Bot className="w-5 h-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                SwasthyaSetu AI Health Assistant
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                General health information &amp; education
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={newChat}
              className="min-h-11 inline-flex items-center gap-1 px-3 rounded-xl text-xs font-bold text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>New chat</span>
            </button>
            <button
              type="button"
              onClick={clearChat}
              disabled={!started}
              className="min-h-11 inline-flex items-center gap-1 px-3 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        <div
          role="log"
          aria-live="polite"
          aria-label="Conversation"
          className="h-[55vh] min-h-72 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/60 dark:bg-slate-900/30"
        >
          {!ready ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>Loading…</span>
            </div>
          ) : (
            <>
              <Bubble role="assistant">
                <p>Hello! How can I help you today? Ask me about health topics, medical terms, nutrition or health myths.</p>
              </Bubble>

              {!started && (
                <div className="pt-1">
                  <p className="text-[11px] font-bold text-slate-500 mb-2">Try asking:</p>
                  <div className="flex flex-wrap gap-2">
                    {STARTER_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void send(prompt)}
                        disabled={loading}
                        className="min-h-11 px-3.5 rounded-full border border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-800 text-xs font-bold text-teal-800 dark:text-teal-200 hover:bg-teal-50 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 cursor-pointer"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <Bubble key={m.id} role={m.role}>
                  <FormattedText text={m.content} />
                  {m.redirect && (
                    <Link
                      href={m.redirect.path}
                      className="mt-2 min-h-11 inline-flex items-center gap-1.5 px-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-extrabold focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                    >
                      <span>Open {m.redirect.label}</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  )}
                </Bubble>
              ))}

              {loading && (
                <Bubble role="assistant">
                  <span className="inline-flex items-center gap-2 text-slate-500" role="status">
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Thinking...</span>
                  </span>
                </Bubble>
              )}

              {error && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-900 dark:text-rose-100 text-xs font-semibold space-y-2"
                >
                  <p>{error.message}</p>
                  <button
                    type="button"
                    onClick={() => void send(error.retryText, true)}
                    disabled={loading}
                    className="min-h-11 px-3.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-extrabold disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2 cursor-pointer"
                  >
                    Try again
                  </button>
                </div>
              )}

              {showQuickActions && (
                <div className="flex flex-wrap gap-2" aria-label="Follow-up options">
                  {QUICK_ACTIONS.map((a) => (
                    <button
                      key={a.label}
                      type="button"
                      onClick={() => void send(a.prompt)}
                      className="min-h-11 px-3.5 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 cursor-pointer"
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={onSubmit} className="border-t border-slate-100 dark:border-slate-700 p-3 space-y-2">
          {speechError && (
            <p role="alert" className="text-[11px] font-semibold text-amber-700">
              {speechError}
            </p>
          )}
          <div className="flex items-end gap-2">
            <label htmlFor="ai-assistant-input" className="sr-only">
              Ask a health question
            </label>
            <textarea
              id="ai-assistant-input"
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              maxLength={MAX_INPUT_CHARS}
              rows={2}
              placeholder={isRecording ? "Listening… speak now" : "Ask a question..."}
              disabled={!ready}
              className="flex-1 resize-none p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            />
            <button
              type="button"
              onClick={() => (isRecording ? stop() : start())}
              disabled={!ready || loading}
              aria-pressed={isRecording}
              aria-label={isRecording ? "Stop voice input" : "Start voice input"}
              className={`min-h-12 min-w-12 inline-flex items-center justify-center rounded-xl border focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:opacity-60 cursor-pointer ${
                isRecording
                  ? "bg-rose-600 border-rose-600 text-white animate-pulse"
                  : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200"
              }`}
            >
              {isRecording ? <MicOff className="w-5 h-5" aria-hidden="true" /> : <Mic className="w-5 h-5" aria-hidden="true" />}
            </button>
            <button
              type="submit"
              disabled={!ready || loading || input.trim().length === 0}
              className="min-h-12 inline-flex items-center justify-center gap-1.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-extrabold disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Send className="w-4 h-4" aria-hidden="true" />}
              <span>Send</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Press Enter to send, Shift+Enter for a new line. For appointments, hospitals, referrals, medicines or emergencies, use those sections of SwasthyaSetu.
          </p>
        </form>
      </section>
    </div>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  const isUser = role === "user";
  return (
    <div className={`flex items-start gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      <span
        aria-hidden="true"
        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
          isUser ? "bg-teal-700 text-white" : "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700"
        }`}
      >
        {isUser ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </span>
      <div
        className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-teal-700 text-white rounded-tr-sm"
            : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-sm"
        }`}
      >
        <span className="sr-only">{isUser ? "You: " : "Assistant: "}</span>
        {children}
      </div>
    </div>
  );
}
