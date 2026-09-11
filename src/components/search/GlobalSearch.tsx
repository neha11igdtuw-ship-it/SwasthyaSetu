"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { groupSearchResults, searchNavigation } from "@/lib/search/searchService";
import type { SearchAudience } from "@/lib/search/searchTypes";

interface GlobalSearchProps {
  audience: SearchAudience;
  variant?: "desktop" | "mobile";
  onCloseMobile?: () => void;
}

export function GlobalSearch({
  audience,
  variant = "desktop",
  onCloseMobile,
}: GlobalSearchProps) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const results = useMemo(
    () => searchNavigation({ query, audience, limit: 5 }),
    [query, audience]
  );
  const groups = useMemo(() => groupSearchResults(results), [results]);
  const showDropdown = isOpen && query.trim().length > 0;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, audience]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectHref = (href: string) => {
    setIsOpen(false);
    setQuery("");
    onCloseMobile?.();
    router.push(href);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      setQuery("");
      inputRef.current?.blur();
      onCloseMobile?.();
      return;
    }

    if (!showDropdown || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = results[selectedIndex];
      if (target) selectHref(target.href);
    }
  };

  let optionOffset = 0;

  return (
    <div ref={rootRef} className={variant === "desktop" ? "relative w-full" : "relative w-full"}>
      <div className="relative flex items-center">
        <Search
          className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 pointer-events-none"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id={variant === "desktop" ? "header-search" : "header-search-mobile"}
          type="text"
          role="combobox"
          aria-label="Search SwasthyaSetu"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            showDropdown && results[selectedIndex] ? `${listId}-opt-${selectedIndex}` : undefined
          }
          value={query}
          autoFocus={variant === "mobile"}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search SwasthyaSetu..."
          className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {showDropdown ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Search results"
          className={`${
            variant === "desktop"
              ? "absolute top-full left-0 right-0 mt-1.5 z-50"
              : "mt-1.5"
          } bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden text-xs py-1`}
        >
          {results.length > 0 ? (
            groups.map((group) => {
              const start = optionOffset;
              optionOffset += group.items.length;

              return (
                <div key={group.category}>
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {group.category}
                  </div>
                  {group.items.map((item, groupIndex) => {
                    const index = start + groupIndex;
                    const Icon = item.icon;
                    const isSelected = index === selectedIndex;

                    return (
                      <button
                        key={item.id}
                        id={`${listId}-opt-${index}`}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => selectHref(item.href)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between transition-colors cursor-pointer focus:outline-none ${
                          isSelected
                            ? "bg-teal-50 dark:bg-teal-900/40 text-teal-900 dark:text-teal-200"
                            : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`p-1.5 rounded-lg shrink-0 ${
                              isSelected
                                ? "bg-teal-700 text-white"
                                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                          </div>
                          <span className="truncate font-semibold">{item.title}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })
          ) : (
            <div role="status" className="p-4 text-center text-slate-500 dark:text-slate-400 font-medium">
              No results found
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
