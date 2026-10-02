"use client";

import React, { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ConversationList } from "@/components/messages/ConversationList";
import { MessageThread } from "@/components/messages/MessageThread";
import { MessageComposer } from "@/components/messages/MessageComposer";
import { messagesApi } from "@/lib/api/client";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import type {
  CareConversationSummaryOut,
  CareMessageOut,
  MessageCategory,
  MessagePriority,
} from "@/lib/api/types";
import { ArrowLeft, MessageSquare } from "lucide-react";

const POLL_INTERVAL_MS = 30000; // Poll every 30 seconds

export default function DoctorMessagesPage() {
  const user = useCurrentUser();
  const [conversations, setConversations] = useState<CareConversationSummaryOut[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<CareConversationSummaryOut | null>(
    null
  );
  const [messages, setMessages] = useState<CareMessageOut[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInbox = useCallback(async () => {
    if (!user) return;

    try {
      const list = await messagesApi.getInbox();
      // Sort to show unread and urgent first
      const sorted = [...list].sort((a, b) => {
        if (a.unread_count > 0 && b.unread_count === 0) return -1;
        if (a.unread_count === 0 && b.unread_count > 0) return 1;
        if (a.has_urgent && !b.has_urgent) return -1;
        if (!a.has_urgent && b.has_urgent) return 1;
        return 0;
      });
      setConversations(sorted);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inbox");
    } finally {
      setIsLoadingList(false);
    }
  }, [user]);

  const loadConversation = useCallback(
    async (conversation: CareConversationSummaryOut) => {
      if (!user) return;

      setIsLoadingThread(true);
      try {
        const response = await messagesApi.getPatientConversation(conversation.patient_id);
        setMessages(response.messages || []);
        setSelectedConversation(conversation);
        setError(null);

        // Mark unread messages as read
        if (response.id && response.messages?.length > 0) {
          const unreadMessageIds = response.messages
            .filter((msg: CareMessageOut) => !msg.is_read && msg.sender_user_id !== user.id)
            .map((msg: CareMessageOut) => msg.id);

          if (unreadMessageIds.length > 0) {
            try {
              await messagesApi.markAsRead(response.id, unreadMessageIds);
            } catch {
              // Silently continue
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load conversation");
      } finally {
        setIsLoadingThread(false);
      }
    },
    [user]
  );

  // Initial load
  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  // Set up polling
  useEffect(() => {
    if (!user) return;

    const setupPoll = async () => {
      await loadInbox();
      if (selectedConversation) {
        await loadConversation(selectedConversation);
      }
    };

    const timeout = setTimeout(setupPoll, POLL_INTERVAL_MS);
    return () => clearTimeout(timeout);
  }, [user, selectedConversation, loadInbox, loadConversation]);

  const handleSendMessage = async (
    body: string,
    category: MessageCategory,
    priority: MessagePriority
  ) => {
    if (!user || !selectedConversation) {
      setError("Conversation not ready");
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const newMessage = await messagesApi.sendMessage(selectedConversation.patient_id, {
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
    <div className="flex h-[calc(100vh-120px)] bg-slate-50 dark:bg-slate-900">
      {/* Conversation List */}
      <div
        className={`${
          selectedConversation ? "hidden" : "flex flex-col"
        } w-full md:flex md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800`}
      >
        <PageHeader
          title="Care Team Messages"
          subtitle="Patient consultations"
        />
        <div className="flex-1 overflow-y-auto">
          <ConversationList
            conversations={conversations}
            onSelect={loadConversation}
            isLoading={isLoadingList}
          />
        </div>
      </div>

      {/* Message Thread */}
      {selectedConversation ? (
        <div className="flex flex-col flex-1 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
          {/* Header */}
          <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 py-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setSelectedConversation(null);
                  setMessages([]);
                }}
                className="md:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">{selectedConversation.patient_name}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Patient consultation</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mx-4 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="mx-auto max-w-2xl bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 md:p-6">
              <MessageThread
                messages={messages}
                currentUserId={user.id}
                isLoading={isLoadingThread}
              />
            </div>
          </div>

          {/* Composer */}
          <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <MessageComposer
              onSend={handleSendMessage}
              isLoading={isSending}
              userRole={user.role}
            />
          </div>
        </div>
      ) : (
        <div className="messages-empty-state flex-1 flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <MessageSquare className="h-7 w-7" />
          </div>
          <div className="text-center">
            <p className="font-medium text-slate-700 dark:text-slate-300">Select a patient</p>
            <p className="text-sm">Choose a conversation on the left to view their consultation</p>
          </div>
        </div>
      )}
    </div>
  );
}
