"use client";

import React, { useEffect, useRef } from "react";
import { AlertOctagon, Clock, CheckCheck, Check } from "lucide-react";
import type { CareMessageOut } from "@/lib/api/types";

interface MessageThreadProps {
  messages: CareMessageOut[];
  currentUserId: string;
  isLoading?: boolean;
}

const getRoleColor = (role: string) => {
  switch (role) {
    case "PATIENT":
      return "bg-teal-50 border-teal-200";
    case "HEALTH_WORKER":
      return "bg-blue-50 border-blue-200";
    case "DOCTOR":
      return "bg-purple-50 border-purple-200";
    default:
      return "bg-slate-50 border-slate-200";
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case "PATIENT":
      return "You";
    case "HEALTH_WORKER":
      return "Health Worker";
    case "DOCTOR":
      return "Doctor";
    default:
      return role;
  }
};

const getCategoryLabel = (category: string) => {
  return category.replace(/_/g, " ");
};

export function MessageThread({
  messages,
  currentUserId,
  isLoading = false,
}: MessageThreadProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500 text-center px-4">
        <div className="mb-4 p-3 rounded-full bg-slate-100 dark:bg-slate-700">
          <Clock className="w-8 h-8 text-slate-400 dark:text-slate-500" />
        </div>
        <p className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">No messages yet</p>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm">
          You can ask your care team about a symptom, medicine, appointment, referral, or follow-up.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const isOwn = message.sender_user_id === currentUserId;

        return (
          <div
            key={message.id}
            className={`flex gap-3 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
          >
            {/* Avatar circle */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold ${
                message.sender_role === "PATIENT"
                  ? "bg-teal-100 text-teal-700"
                  : message.sender_role === "HEALTH_WORKER"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-purple-100 text-purple-700"
              }`}
            >
              {message.sender_display_name.charAt(0).toUpperCase()}
            </div>

            {/* Message bubble */}
            <div className={`flex-1 max-w-md ${isOwn ? "flex flex-col items-end" : ""}`}>
              <div className={`px-4 py-3 rounded-lg border ${getRoleColor(message.sender_role)}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-700">
                    {isOwn ? "You" : message.sender_display_name}
                  </span>
                  {message.sender_role !== "PATIENT" && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        message.sender_role === "HEALTH_WORKER"
                          ? "bg-blue-200 text-blue-800"
                          : "bg-purple-200 text-purple-800"
                      }`}
                    >
                      {getRoleLabel(message.sender_role)}
                    </span>
                  )}
                </div>

                {/* Category and priority badges */}
                <div className="flex gap-1 mb-2 flex-wrap">
                  {message.category !== "GENERAL" && (
                    <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                      {getCategoryLabel(message.category)}
                    </span>
                  )}
                  {message.priority === "URGENT" && (
                    <span className="text-xs bg-red-200 text-red-700 px-2 py-0.5 rounded flex items-center gap-1">
                      <AlertOctagon className="w-3 h-3" />
                      Urgent
                    </span>
                  )}
                </div>

                <p className="text-sm text-slate-800 break-words">{message.body}</p>
              </div>

              {/* Timestamp and read status */}
              <div className={`flex items-center gap-1 mt-1 text-xs text-slate-500 ${isOwn ? "flex-row-reverse" : ""}`}>
                <span>{new Date(message.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                {isOwn && (
                  message.is_read ? (
                    <CheckCheck className="w-4 h-4 text-teal-600" aria-label="Seen" />
                  ) : (
                    <Check className="w-4 h-4" aria-label="Sent" />
                  )
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
