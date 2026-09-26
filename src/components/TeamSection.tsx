"use client";

import React from "react";
import { Users } from "lucide-react";

const teamMembers: string[] = [
  "Neha",
  "Palak Mishra",
  "Nandini Singh",
  "Nandini Goyal",
  "Nidhi Gupta",
  "Marushika",
];

export function TeamSection() {
  return (
    <div className="text-center space-y-8">
      <div className="max-w-xl mx-auto space-y-2">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-teal-600 text-white mx-auto mb-2">
          <Users className="w-5 h-5" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Team Members
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {teamMembers.map((name) => (
          <div
            key={name}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f2530] p-5 shadow-xs"
          >
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
              {name}
            </h3>
          </div>
        ))}
      </div>
    </div>
  );
}
