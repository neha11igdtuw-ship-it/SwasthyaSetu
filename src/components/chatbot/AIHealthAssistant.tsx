"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Loader2, Mic, MicOff, Plus, Send, Trash2, User as UserIcon, X } from "lucide-react";
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

/** Translation keys (see aiChatText in translations.ts) for the starter questions. */
const STARTER_KEYS = [
  "aiChat.starter1",
  "aiChat.starter2",
  "aiChat.starter3",
  "aiChat.starter4",
  "aiChat.starter5",
] as const;

/** Follow-up shortcuts; they continue the current conversation in the selected language. */
const QUICK_ACTIONS: ReadonlyArray<{ labelKey: string; promptKey: string }> = [
  { labelKey: "aiChat.quickSimple", promptKey: "aiChat.quickSimplePrompt" },
  { labelKey: "aiChat.quickExample", promptKey: "aiChat.quickExamplePrompt" },
  { labelKey: "aiChat.quickSteps", promptKey: "aiChat.quickStepsPrompt" },
];

/** Existing nav translation keys, so redirect buttons use the app's own section names. */
const REDIRECT_LABEL_KEYS: Record<string, string> = {
  "/patient/appointments": "appointments",
  "/patient/facilities": "nearbyFacilities",
  "/patient/referrals": "referrals",
  "/patient/medicines": "medicines",
  "/patient/emergency-help": "emergencyHelp",
  "/patient/records": "records",
  "/patient/symptoms": "symptoms",
};

function friendlyError(err: unknown, t: (key: string) => string): string {
  if (err instanceof ApiError) {
    if (err.code === "DEMO_READ_ONLY") return err.message;
    if (err.status === 429) return t("aiChat.errorRateLimit");
    if (err.status === 0) return t("aiChat.errorNetwork");
    if (err.status === 401) return t("aiChat.errorSession");
  }
  return t("aiChat.errorGeneric");
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

/**
 * Floating AI Health Assistant: a small round button fixed to the bottom-right
 * that opens a compact chatbox on the current page. It is the ONLY chatbot
 * implementation; it stays mounted while closed, so the conversation (also
 * mirrored to per-user sessionStorage) survives closing and reopening.
 *
 * The language always comes from the app's single language context, so the
 * UI strings, the speech language and the `ui_language` sent to the backend
 * all follow the language picked in the main language selector, including
 * changes made while the chatbox is open.
 */
export function AIHealthAssistant() {
  const { language, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const user = useCurrentUser();
  const userId = user?.id ?? null;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string>("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; retryText: string } | null>(null);
  const [ready, setReady] = useState(false);

  const openRef = useRef(false);
  openRef.current = open;
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
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, error, open]);

  // Focus the input when the chatbox opens.
  useEffect(() => {
    if (open && ready) textareaRef.current?.focus();
  }, [open, ready]);

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
        setError({ message: friendlyError(err, t), retryText: text });
      } finally {
        loadingRef.current = false;
        setLoading(false);
        if (openRef.current) textareaRef.current?.focus();
      }
    },
    [isRecording, language, ready, stop, t]
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

  const closeChat = useCallback(() => {
    if (isRecording) stop();
    setOpen(false);
    launcherRef.current?.focus();
  }, [isRecording, stop]);

  const onPanelKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      closeChat();
    }
  };

  const redirectLabel = (r: NonNullable<ChatMessage["redirect"]>) => {
    const key = REDIRECT_LABEL_KEYS[r.path];
    const translated = key ? t(key) : "";
    return translated && translated !== key ? translated : r.label;
  };

  const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1";

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-modal="false"
          aria-label={t("aiChat.tooltip")}
          onKeyDown={onPanelKeyDown}
          className="fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl bottom-[76px] left-3 right-3 h-[min(70vh,560px)] md:left-auto md:right-6 md:bottom-[90px] md:w-[380px] md:h-[min(580px,calc(100vh-120px))]"
        >
          <header className="flex items-center justify-between gap-2 px-3 py-2.5 bg-teal-700 text-white">
            <div className="flex items-center gap-2 min-w-0">
              <span className="p-1.5 rounded-lg bg-white/15">
                <Bot className="w-4 h-4" aria-hidden="true" />
              </span>
              <h2 className="text-sm font-extrabold truncate">{t("aiChat.tooltip")}</h2>
            </div>
            <button
              type="button"
              onClick={closeChat}
              aria-label={t("aiChat.close")}
              title={t("aiChat.close")}
              className="min-h-10 min-w-10 inline-flex items-center justify-center rounded-lg hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </header>

          <div className="px-3 pt-2 pb-1 space-y-2 border-b border-slate-100 dark:border-slate-700">
            <DisclaimerCard variant="info" compact text={t("aiChat.disclaimer")} />
            <div className="flex items-center gap-2 pb-1">
              <button
                type="button"
                onClick={newChat}
                className={`min-h-9 inline-flex items-center gap-1 px-2.5 rounded-lg text-[11px] font-bold text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 cursor-pointer ${focusRing}`}
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t("aiChat.newChat")}</span>
              </button>
              <button
                type="button"
                onClick={clearChat}
                disabled={!started}
                className={`min-h-9 inline-flex items-center gap-1 px-2.5 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 disabled:opacity-50 cursor-pointer ${focusRing}`}
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t("aiChat.clear")}</span>
              </button>
            </div>
          </div>

          <div
            role="log"
            aria-live="polite"
            aria-label={t("aiChat.conversation")}
            className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3 bg-slate-50/60 dark:bg-slate-900/30"
          >
            {!ready ? (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>{t("aiChat.loading")}</span>
              </div>
            ) : (
              <>
                <Bubble role="assistant">
                  <p>{t("aiChat.greeting")}</p>
                </Bubble>

                {!started && (
                  <div className="pt-1">
                    <p className="text-[11px] font-bold text-slate-500 mb-2">{t("aiChat.tryAsking")}</p>
                    <div className="flex flex-wrap gap-2">
                      {STARTER_KEYS.map((key) => {
                        const prompt = t(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => void send(prompt)}
                            disabled={loading}
                            className={`min-h-10 px-3 rounded-full border border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-800 text-xs font-bold text-teal-800 dark:text-teal-200 hover:bg-teal-50 disabled:opacity-60 cursor-pointer ${focusRing}`}
                          >
                            {prompt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {messages.map((m) => (
                  <Bubble key={m.id} role={m.role}>
                    <FormattedText text={m.content} />
                    {m.redirect && (
                      <Link
                        href={m.redirect.path}
                        onClick={() => setOpen(false)}
                        className="mt-2 min-h-10 inline-flex items-center gap-1.5 px-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-extrabold focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                      >
                        <span className="sr-only">{t("aiChat.open.section")} </span>
                        <span>{redirectLabel(m.redirect)}</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </Link>
                    )}
                  </Bubble>
                ))}

                {loading && (
                  <Bubble role="assistant">
                    <span className="inline-flex items-center gap-2 text-slate-500" role="status">
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span>{t("aiChat.thinking")}</span>
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
                      className="min-h-10 px-3 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-extrabold disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2 cursor-pointer"
                    >
                      {t("aiChat.retry")}
                    </button>
                  </div>
                )}

                {showQuickActions && (
                  <div className="flex flex-wrap gap-2" aria-label={t("aiChat.followUpOptions")}>
                    {QUICK_ACTIONS.map((a) => (
                      <button
                        key={a.labelKey}
                        type="button"
                        onClick={() => void send(t(a.promptKey))}
                        className={`min-h-10 px-3 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer ${focusRing}`}
                      >
                        {t(a.labelKey)}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={onSubmit} className="border-t border-slate-100 dark:border-slate-700 p-2.5 space-y-1.5">
            {speechError && (
              <p role="alert" className="text-[11px] font-semibold text-amber-700">
                {speechError}
              </p>
            )}
            <div className="flex items-end gap-2">
              <label htmlFor="ai-assistant-input" className="sr-only">
                {t("aiChat.placeholder")}
              </label>
              <textarea
                id="ai-assistant-input"
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                maxLength={MAX_INPUT_CHARS}
                rows={2}
                placeholder={isRecording ? t("aiChat.listening") : t("aiChat.placeholder")}
                disabled={!ready}
                className="flex-1 min-w-0 resize-none p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              />
              <button
                type="button"
                onClick={() => (isRecording ? stop() : start())}
                disabled={!ready || loading}
                aria-pressed={isRecording}
                aria-label={isRecording ? t("aiChat.voiceStop") : t("aiChat.voiceStart")}
                title={isRecording ? t("aiChat.voiceStop") : t("aiChat.voiceStart")}
                className={`min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl border disabled:opacity-60 cursor-pointer ${focusRing} ${
                  isRecording
                    ? "bg-rose-600 border-rose-600 text-white animate-pulse"
                    : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200"
                }`}
              >
                {isRecording ? <MicOff className="w-5 h-5" aria-hidden="true" /> : <Mic className="w-5 h-5" aria-hidden="true" />}
              </button>
              <button
                type="submit"
                aria-label={t("aiChat.send")}
                disabled={!ready || loading || input.trim().length === 0}
                className="min-h-11 inline-flex items-center justify-center gap-1.5 px-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-extrabold disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Send className="w-4 h-4" aria-hidden="true" />}
                <span>{t("aiChat.send")}</span>
              </button>
            </div>
            <p className="text-[10px] leading-snug text-slate-500 dark:text-slate-400">{t("aiChat.hint")}</p>
          </form>
        </section>
      )}

      <div className="fixed z-50 right-3 md:right-6 bottom-[136px] md:bottom-6 group">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hidden md:block"
        >
          {t("aiChat.tooltip")}
        </span>
        <button
          ref={launcherRef}
          type="button"
          onClick={() => (open ? closeChat() : setOpen(true))}
          aria-label={open ? t("aiChat.close") : t("aiChat.open")}
          aria-haspopup="dialog"
          aria-expanded={open}
          title={t("aiChat.tooltip")}
          className="w-[50px] h-[50px] md:w-14 md:h-14 inline-flex items-center justify-center rounded-full bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white shadow-lg ring-2 ring-white/70 dark:ring-slate-900/70 transition-colors cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-300"
        >
          {open ? <X className="w-6 h-6" aria-hidden="true" /> : <Bot className="w-6 h-6 md:w-7 md:h-7" aria-hidden="true" />}
        </button>
      </div>
    </>
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
