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
  competitionType: string;
  referee: string;
  sizeStandard: string;
  isRelay: boolean;
};

/**
 * Changing the class also settles the fields that depend on it: classes that
 * cannot be official are forced to "mitteametlik", and only team classes can
 * be a relay. Mirrors handleTrackFieldChange in organizerPage.
 */
function withTrackType(form: TrackFormData, trackType: string): TrackFormData {
  return {
    ...form,
    trackType,
    competitionType: NON_OFFICIAL_TRACK_TYPES.has(trackType)
      ? "mitteametlik"
      : form.competitionType,
    isRelay: TEAM_TRACK_TYPES.has(trackType) ? form.isRelay : false,
  };
}

export function TrackForm({
  defaultDate,
  onSubmit,
  onCancel,
  saving,
}: {
  defaultDate: string;
  onSubmit: (data: TrackFormData) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<TrackFormData>({
    competitionDate: defaultDate,
    letter: "A",
    trackType: "A1",
    size: "S",
    competitionType: "ametlik",
    referee: "",
    sizeStandard: "EST",
    isRelay: false,
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="bg-white rounded-xl border border-gray-200 p-6"
    >
      <h3 className="text-base font-semibold text-gray-900 mb-4">Lisa uus rada</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kuupäev *</label>
          <input
            type="date"
            value={form.competitionDate}
            onChange={(e) => setForm({ ...form, competitionDate: e.target.value })}
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Tüüp *</label>
          <select
            value={form.trackType}
            onChange={(e) => setForm(withTrackType(form, e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {TRACK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Suurus *</label>
          <select
            value={form.size}
            onChange={(e) => setForm({ ...form, size: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ametlikkus *</label>
          <select
            value={form.competitionType}
            onChange={(e) => setForm({ ...form, competitionType: e.target.value })}
            disabled={NON_OFFICIAL_TRACK_TYPES.has(form.trackType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          >
            {TRACK_OFFICIALITY.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kohtunik</label>
          <input
            type="text"
            value={form.referee}
            onChange={(e) => setForm({ ...form, referee: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
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
        <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {saving ? "Lisamine..." : "Lisa rada"}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors">
          Tühista
        </button>
      </div>
    </form>
  );
}
