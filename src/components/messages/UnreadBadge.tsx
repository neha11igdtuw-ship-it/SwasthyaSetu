"use client";

import React from "react";

interface UnreadBadgeProps {
  count: number;
  className?: string;
}

export function UnreadBadge({ count, className = "" }: UnreadBadgeProps) {
  if (count === 0) return null;

  const displayCount = count > 99 ? "99+" : count;

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-600 text-white text-xs font-semibold ${className}`}
      title={`${count} unread message${count !== 1 ? "s" : ""}`}
    >
      {displayCount}
    </span>
  );
}
