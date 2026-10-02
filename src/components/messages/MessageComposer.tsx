"use client";

import React, { useState } from "react";
import { Send, AlertTriangle } from "lucide-react";
import { MessageCategory, MessagePriority } from "@/lib/api/types";
import { MessageCategorySelector } from "./MessageCategorySelector";

interface MessageComposerProps {
  onSend: (body: string, category: MessageCategory, priority: MessagePriority) => Promise<void>;
  isLoading?: boolean;
  userRole: string;
}

export function MessageComposer({ onSend, isLoading = false, userRole }: MessageComposerProps) {
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<MessageCategory>("GENERAL");
  const [priority, setPriority] = useState<MessagePriority>("NORMAL");
  const [showUrgentWarning, setShowUrgentWarning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!body.trim()) {
      setError("Message cannot be empty");
      return;
    }

    if (body.trim().length > 2000) {
      setError("Message cannot exceed 2000 characters");
      return;
    }

    try {
      setError(null);
      await onSend(body, category, priority);
      setBody("");
      setCategory("GENERAL");
      setPriority("NORMAL");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    }
  };

  const handlePriorityChange = (newPriority: MessagePriority) => {
    if (newPriority === "URGENT" && userRole === "PATIENT") {
      setShowUrgentWarning(true);
    } else {
      setShowUrgentWarning(false);
      setPriority(newPriority);
    }
  };

  const confirmUrgent = () => {
    setPriority("URGENT");
    setShowUrgentWarning(false);
  };

  return (
    <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 space-y-3">
      {/* Emergency Help Notice for Patients */}
      {userRole === "PATIENT" && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
          <p className="font-medium mb-1">For a medical emergency:</p>
          <p className="mb-2">Do not wait for a reply here. Use Emergency Help or contact emergency services immediately.</p>
          <a
            href="/patient/emergency-help"
            className="text-amber-700 font-semibold hover:underline"
          >
            Go to Emergency Help →
          </a>
        </div>
      )}

      {/* Category and Priority Selectors */}
      <div className="flex gap-3 flex-wrap">
        <MessageCategorySelector value={category} onChange={setCategory} />
        <select
          value={priority}
          onChange={(e) => handlePriorityChange(e.target.value as MessagePriority)}
          disabled={isLoading}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
        >
          <option value="NORMAL">Normal priority</option>
          <option value="URGENT">Urgent priority</option>
        </select>
      </div>

      {/* Urgent Warning Dialog */}
      {showUrgentWarning && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-900">
              <p className="font-semibold mb-1">Urgent messages</p>
              <p className="mb-3">
                Urgent messages are shared with your care team. For a medical emergency, use Emergency Help immediately.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={confirmUrgent}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded font-medium hover:bg-red-700"
                >
                  Send as Urgent
                </button>
                <button
                  onClick={() => setShowUrgentWarning(false)}
                  className="px-3 py-1 bg-red-200 text-red-900 text-sm rounded font-medium hover:bg-red-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div>
        <textarea
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setError(null);
          }}
          placeholder="Type your message here..."
          disabled={isLoading || showUrgentWarning}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none disabled:opacity-50 text-sm"
          rows={3}
        />
        <div className="flex items-center justify-between mt-2">
          <div className="text-xs text-slate-500">
            {body.length}/2000 characters
          </div>
          {error && <div className="text-xs text-red-600 font-medium">{error}</div>}
        </div>
      </div>

      {/* Send Button */}
      <button
        onClick={handleSend}
        disabled={isLoading || showUrgentWarning || !body.trim()}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Send className="w-4 h-4" />
        {isLoading ? "Sending..." : "Send Message"}
      </button>
    </div>
  );
}
