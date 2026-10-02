"use client";

import React, { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import { MessageThread } from "@/components/messages/MessageThread";
import { MessageComposer } from "@/components/messages/MessageComposer";
import { messagesApi } from "@/lib/api/client";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import type { CareMessageOut, MessageCategory, MessagePriority } from "@/lib/api/types";

const POLL_INTERVAL_MS = 20000; // Poll every 20 seconds

export default function PatientMessagesPage() {
  const user = useCurrentUser();
  const [messages, setMessages] = useState<CareMessageOut[]>([]);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversation = useCallback(async () => {
    if (!user) return;

    try {
      const response = await messagesApi.getOwnConversation();
      setPatientId(response.patient_id);
      setMessages(response.messages || []);
      setError(null);

      // Mark all visible messages as read
      if (response.id && response.messages?.length > 0) {
        const unreadMessageIds = response.messages
          .filter((msg: CareMessageOut) => !msg.is_read && msg.sender_user_id !== user.id)
          .map((msg: CareMessageOut) => msg.id);

        if (unreadMessageIds.length > 0) {
          try {
            await messagesApi.markAsRead(response.id, unreadMessageIds);
          } catch {
            // Silently continue if marking as read fails
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversation");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  // Set up polling
  useEffect(() => {
    if (!user) return;

    const setupPoll = async () => {
      await loadConversation();
      setTimeout(setupPoll, POLL_INTERVAL_MS);
    };

    const timeout = setTimeout(setupPoll, POLL_INTERVAL_MS);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [user, loadConversation]);

  const handleSendMessage = async (
    body: string,
    category: MessageCategory,
    priority: MessagePriority
  ) => {
    if (!user || !patientId) {
      setError("Conversation not ready");
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const newMessage = await messagesApi.sendMessage(patientId, {
        body,
        category,
        priority,
      });

      setMessages((prev) => [...prev, newMessage]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to send message";
      setError(errorMsg);
      throw err;
    } finally {
      setIsSending(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
      <PageHeader
        title="Care Team Messages"
        subtitle="Communicate with your health worker and doctor"
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {error && (
          <div className="mx-auto max-w-2xl p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="mx-auto max-w-2xl bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6 min-h-[300px]">
          <MessageThread
            messages={messages}
            currentUserId={user.id}
            isLoading={isLoading}
          />
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <MessageComposer
          onSend={handleSendMessage}
          isLoading={isSending}
          userRole={user.role}
        />
      </div>
    </div>
  );
}
