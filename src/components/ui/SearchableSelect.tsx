"use client";

import { useEffect, useRef, useState } from "react";

export interface SearchableOption {
  id: number;
  label: string;
  /** Optional secondary line, e.g. a club name. */
  hint?: string | null;
}

/**
 * Type-to-filter picker. The list appears as soon as the field is focused and
 * narrows as you type; picking an option reports its id.
 *
 * Deliberately reports an id rather than the typed text - callers use this to
 * choose an existing record, never to rename one.
 */
export function SearchableSelect({
  options,
  value,
  onSelect,
  onCancel,
  placeholder = "Otsi...",
  emptyText = "Vasteid ei leitud",
  autoFocus = false,
}: {
  options: SearchableOption[];
  /** Currently selected id, shown as the initial text. */
  value?: number | null;
  onSelect: (id: number) => void;
  onCancel?: () => void;
  placeholder?: string;
  emptyText?: string;
  autoFocus?: boolean;
}) {
  const selected = options.find((o) => o.id === value);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
        onCancel?.();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onCancel]);

  const query = search.trim().toLowerCase();
  const filtered = query
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query) ||
          (o.hint ?? "").toLowerCase().includes(query)
      )
    : options;

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        autoFocus={autoFocus}
        value={open ? search : selected?.label ?? ""}
        placeholder={selected?.label ?? placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setSearch("");
            onCancel?.();
          }
        }}
        className="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />

      {open && (
        <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-gray-500">{emptyText}</li>
          ) : (
            filtered.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setSearch("");
                    onSelect(o.id);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                    o.id === value ? "bg-blue-50 font-medium" : ""
                  }`}
                >
                  {o.label}
                  {o.hint && <span className="block text-xs text-gray-500">{o.hint}</span>}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
