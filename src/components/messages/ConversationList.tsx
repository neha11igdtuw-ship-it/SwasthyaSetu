"use client";

import React from "react";
import { AlertOctagon, ChevronRight } from "lucide-react";
import type { CareConversationSummaryOut } from "@/lib/api/types";
import { UnreadBadge } from "./UnreadBadge";

interface ConversationListProps {
  conversations: CareConversationSummaryOut[];
  onSelect: (conversation: CareConversationSummaryOut) => void;
  isLoading?: boolean;
}

export function ConversationList({
  conversations,
  onSelect,
  isLoading = false,
}: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-center px-4">
        <div className="text-lg font-medium mb-2 text-slate-600 dark:text-slate-300">No conversations yet</div>
        <p className="text-sm text-slate-500 dark:text-slate-400">Conversations will appear here as patients send messages.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-700">
      {conversations.map((conv) => (
        <button
          key={conv.id}
          onClick={() => onSelect(conv)}
          className="w-full px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left focus:outline-none focus:bg-slate-100 dark:focus:bg-slate-700"
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                  {conv.patient_name}
                </h3>
                {conv.has_urgent && (
                  <AlertOctagon className="w-4 h-4 text-red-600 dark:text-red-500 flex-shrink-0" aria-label="Has urgent messages" />
                )}
              </div>
              {conv.latest_message_preview && (
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                  {conv.latest_message_preview}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {conv.unread_count > 0 && (
                <UnreadBadge count={conv.unread_count} />
              )}
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">
              {conv.latest_message_time
                ? new Date(conv.latest_message_time).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  })
                : "No messages"}
            </div>
            {conv.latest_message_priority === "URGENT" && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
                Urgent
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
