"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";

interface Capacity {
  dates: string[];
  maxPerDay: Record<string, number>;
  registeredPerDay: Record<string, number>;
}

/**
 * The per-day start limit (production's "Maksimaalne startide arv päeva kohta").
 *
 * An empty field means no limit for that day. Saving posts only
 * `maxCompetitorsPerDay`, which the info route treats as a partial update, so
 * the descriptions are left alone.
 */
export function MaxPerDayPanel({
  bookingId,
  onMessage,
}: {
  bookingId: string;
  onMessage: (message: { type: "success" | "error"; text: string }) => void;
}) {
  const [capacity, setCapacity] = useState<Capacity | null>(null);
  const [limits, setLimits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Bumped after a save, to read the counts back with the new limits applied.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/competitions/${bookingId}/capacity`);
        if (!res.ok || cancelled) return;
        const data: Capacity = await res.json();
        if (cancelled) return;
        setCapacity(data);
        setLimits(
          Object.fromEntries(
            data.dates.map((date) => [date, data.maxPerDay[date]?.toString() ?? ""])
          )
        );
      } catch {
        // The panel simply stays empty; the rest of the settings still work.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bookingId, reloadKey]);

  async function handleSave() {
    setSaving(true);
    try {
      // Only the days that carry a number are sent; a cleared field drops out
      // of the map, which is how a day goes back to having no limit.
      const maxCompetitorsPerDay = Object.fromEntries(
        Object.entries(limits)
          .filter(([, value]) => value !== "" && Number(value) > 0)
          .map(([date, value]) => [date, Math.floor(Number(value))])
      );

      const res = await fetch(`/api/competitions/${bookingId}/info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxCompetitorsPerDay }),
      });

      if (res.ok) {
        onMessage({ type: "success", text: "Startide piirang salvestatud!" });
        setReloadKey((key) => key + 1);
      } else {
        const err = await res.json();
        onMessage({ type: "error", text: err.error || "Salvestamine ebaõnnestus" });
      }
    } catch {
      onMessage({ type: "error", text: "Serveri viga" });
    } finally {
      setSaving(false);
    }
  }

  if (loading || !capacity || capacity.dates.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        Maksimaalne startide arv päeva kohta
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Tühi väli tähendab, et piirang puudub. Kui päev on täis, ei saa sellele
        päevale enam registreeruda.
      </p>

      <div className="space-y-3">
        {capacity.dates.map((date) => {
          const registered = capacity.registeredPerDay[date] ?? 0;
          const value = limits[date] ?? "";
          const max = value === "" ? null : Number(value);
          const hasLimit = max !== null && max > 0;
          const spotsLeft = hasLimit ? Math.max(0, max - registered) : null;

          return (
            <div key={date} className="flex items-center gap-3">
              <label className="text-sm text-gray-700 w-32 shrink-0" htmlFor={`max-${date}`}>
                {formatDate(date)}
              </label>
              <input
                id={`max-${date}`}
                type="number"
                min={0}
                value={value}
                onChange={(e) => setLimits({ ...limits, [date]: e.target.value })}
                placeholder="Piirang puudub"
                className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {hasLimit ? (
                <span className={`text-sm ${spotsLeft === 0 ? "text-red-600 font-medium" : "text-gray-600"}`}>
                  {spotsLeft === 0
                    ? `${registered}/${max} — kohad täis`
                    : `${registered}/${max} (vabu kohti: ${spotsLeft})`}
                </span>
              ) : (
                registered > 0 && (
                  <span className="text-sm text-gray-500">{registered} registreerunud</span>
                )
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {saving ? "Salvestamine..." : "Salvesta piirangud"}
      </button>
    </div>
  );
}
