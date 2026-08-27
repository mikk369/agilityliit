"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import type { Translations } from "@/i18n/translations/et";
import type { CompetitionTrack, MyRegistration } from "@/types";

/**
 * Change which tracks an existing entry is registered for.
 *
 * The full selection is sent back, not a delta — the same shape the
 * registration flow posts, so both write paths agree.
 */
export function TrackEditor({
  reg,
  locale,
  t,
  onClose,
  onSaved,
  onError,
}: {
  reg: MyRegistration;
  locale: string;
  t: Translations;
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [tracks, setTracks] = useState<CompetitionTrack[] | null>(null);
  // The modal is mounted per entry, so the current selection is the initial state.
  const [selected, setSelected] = useState<number[]>(() =>
    reg.competitorTracks.map((ct) => ct.competitionTrack.id)
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/bookings/${reg.booking.id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((booking) => {
        if (cancelled) return;
        setTracks(booking.competitionTracks ?? []);
      })
      .catch(() => {
        if (!cancelled) onError(t.myCompTracksLoadFailed);
      });
    return () => {
      cancelled = true;
    };
    // onError/t are stable for the lifetime of this modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reg.booking.id]);

  function toggle(trackId: number) {
    setSelected((prev) =>
      prev.includes(trackId) ? prev.filter((id) => id !== trackId) : [...prev, trackId]
    );
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/competitors/${reg.id}/tracks`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackIds: selected }),
      });
      if (res.ok) {
        onSaved();
      } else {
        const err = await res.json();
        onError(err.error || t.saveFailed);
      }
    } catch {
      onError(t.serverError);
    } finally {
      setSaving(false);
    }
  }

  const byDate = new Map<string, CompetitionTrack[]>();
  for (const track of tracks ?? []) {
    const date = track.competitionDate.split("T")[0];
    byDate.set(date, [...(byDate.get(date) ?? []), track]);
  }
  const days = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{t.myCompEditTracks}</h2>
        <p className="text-sm text-gray-500 mb-4">
          {reg.booking.organizerName} · {reg.dog.nickName}
        </p>

        {tracks === null ? (
          <div className="animate-pulse h-24 bg-gray-100 rounded" />
        ) : days.length === 0 ? (
          <p className="text-sm text-gray-500">{t.myCompNoTracks}</p>
        ) : (
          days.map(([date, dayTracks]) => (
            <div key={date} className="mb-4 last:mb-0">
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                {formatDate(date, locale)}
              </h3>
              <div className="space-y-1">
                {dayTracks.map((track) => (
                  <label
                    key={track.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selected.includes(track.id)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(track.id)}
                      onChange={() => toggle(track.id)}
                      className="text-blue-600 rounded"
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <span className="font-medium text-gray-900">{track.letter}</span>
                      <span className="text-sm text-gray-600">{track.trackType}</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                        {track.size}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                        {track.competitionType}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={save}
            disabled={saving || selected.length === 0}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
