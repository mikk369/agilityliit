"use client";

import { useState } from "react";
import {
  SIZES,
  TRACK_TYPES,
  TRACK_OFFICIALITY,
  NON_OFFICIAL_TRACK_TYPES,
  TEAM_TRACK_TYPES,
  TRACK_LETTERS,
} from "@/lib/constants";

export type TrackFormData = {
  competitionDate: string;
  letter: string;
  trackType: string;
  size: string;
  officiality: string;
  referee: string;
  sizeStandard: string;
  isRelay: boolean;
};

/**
 * What "Lisa rada" submits: one row of the form, for every size group ticked.
 *
 * A track is stored per size, but the organizer thinks in rows — "Saturday's
 * B track, H2, for every size" is one decision and used to be five trips
 * through this form. The sizes share the row's letter, the way they do in the
 * WordPress editor.
 */
export type NewTracksData = Omit<TrackFormData, "size"> & { sizes: string[] };

/**
 * Changing the class also settles the fields that depend on it: classes that
 * cannot be official are forced to "mitteametlik", and only team classes can
 * be a relay. Mirrors handleTrackFieldChange in organizerPage.
 */
function withTrackType(form: TrackFormData, trackType: string): TrackFormData {
  return {
    ...form,
    trackType,
    officiality: NON_OFFICIAL_TRACK_TYPES.has(trackType)
      ? "mitteametlik"
      : form.officiality,
    isRelay: TEAM_TRACK_TYPES.has(trackType) ? form.isRelay : false,
  };
}

/** The first letter not yet used on that day, so rows do not collide. */
function nextFreeLetter(used: string[]): string {
  return TRACK_LETTERS.find((letter) => !used.includes(letter)) ?? TRACK_LETTERS[0];
}

export function TrackForm({
  defaultDate,
  referees,
  initial,
  usedLetters,
  onSubmit,
  onAdd,
  onCancel,
  saving,
}: {
  defaultDate: string;
  /** The competition's referees, from its Põhiinfo tab. */
  referees: string[];
  /** The track being edited; absent when adding a new one. */
  initial?: TrackFormData;
  /** Letters already taken, per date, so a new row is offered a free one. */
  usedLetters?: Record<string, string[]>;
  /** Saving an edit; the add flow uses `onAdd` instead. */
  onSubmit?: (data: TrackFormData) => void;
  onAdd?: (data: NewTracksData) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const editing = initial !== undefined;
  const [form, setForm] = useState<TrackFormData>(
    initial ?? {
      competitionDate: defaultDate,
      letter: nextFreeLetter(usedLetters?.[defaultDate] ?? []),
      trackType: "A1",
      size: "S",
      officiality: "ametlik",
      // One referee for the whole competition is the common case; offering it
      // saves picking it on every track.
      referee: referees.length === 1 ? referees[0] : "",
      sizeStandard: "EST",
      isRelay: false,
    }
  );
  // A new row covers every size group unless the organizer unticks some,
  // which is how the WordPress editor starts too.
  const [sizes, setSizes] = useState<string[]>([...SIZES]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (editing) {
          onSubmit?.(form);
          return;
        }
        // `size` is the single-track field the edit form uses; adding
        // carries the ticked list instead.
        const { size, ...row } = form;
        void size;
        onAdd?.({ ...row, sizes });
      }}
      className="bg-white rounded-xl border border-gray-200 p-6"
    >
      <h3 className="text-base font-semibold text-gray-900 mb-4">
        {editing ? "Muuda rada" : "Lisa uus rada"}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kuupäev *</label>
          <input
            type="date"
            value={form.competitionDate}
            onChange={(e) => {
              const competitionDate = e.target.value;
              setForm({
                ...form,
                competitionDate,
                // Letters run per day, so a new day starts from its own first
                // free one. An edited track keeps the letter it has.
                letter: editing
                  ? form.letter
                  : nextFreeLetter(usedLetters?.[competitionDate] ?? []),
              });
            }}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Täht *</label>
          <select
            value={form.letter}
            onChange={(e) => setForm({ ...form, letter: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {TRACK_LETTERS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Võistlusklass *</label>
          <select
            value={form.trackType}
            onChange={(e) => setForm(withTrackType(form, e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {TRACK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className={editing ? "" : "col-span-2 sm:col-span-3"}>
          <label className="block text-sm font-medium text-gray-700 mb-1">Suurusrühm *</label>
          {editing ? (
            <select
              value={form.size}
              onChange={(e) => setForm({ ...form, size: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <div className="flex flex-wrap gap-3 pt-1">
              {SIZES.map((s) => (
                <label key={s} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={sizes.includes(s)}
                    onChange={() =>
                      setSizes(
                        sizes.includes(s)
                          ? sizes.filter((picked) => picked !== s)
                          : SIZES.filter((size) => sizes.includes(size) || size === s)
                      )
                    }
                    className="text-blue-600 rounded"
                  />
                  {s}
                </label>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Võistlustüüp *</label>
          <select
            value={form.officiality}
            onChange={(e) => setForm({ ...form, officiality: e.target.value })}
            disabled={NON_OFFICIAL_TRACK_TYPES.has(form.trackType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          >
            {TRACK_OFFICIALITY.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kohtunik</label>
          {/* Picked from the competition's own referees so the same judge is
              spelled one way on every track. Typed by hand until the Põhiinfo
              tab has any. */}
          {referees.length > 0 ? (
            <select
              value={form.referee}
              onChange={(e) => setForm({ ...form, referee: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">—</option>
              {referees.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={form.referee}
              onChange={(e) => setForm({ ...form, referee: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Suurusstandard</label>
          <select
            value={form.sizeStandard}
            onChange={(e) => setForm({ ...form, sizeStandard: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="EST">EST</option>
            <option value="FCI">FCI</option>
          </select>
        </div>
        <div className="flex items-center pt-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isRelay}
              onChange={(e) => setForm({ ...form, isRelay: e.target.checked })}
              disabled={!TEAM_TRACK_TYPES.has(form.trackType)}
              className="text-blue-600 rounded"
            />
            Teaterada
          </label>
        </div>
      </div>
      <div className="flex gap-3 mt-4">
        <button
          type="submit"
          disabled={saving || (!editing && sizes.length === 0)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving
            ? "Salvestamine..."
            : editing
              ? "Salvesta rada"
              : `Lisa ${sizes.length} rada`}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors">
          Tühista
        </button>
      </div>
    </form>
  );
}
