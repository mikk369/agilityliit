"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

interface TrackOption {
  id: number;
  letter: string;
  trackType: string;
  size: string;
  competitionType: string;
  competitionDate: string;
  sortOrder: number;
}

interface AwardingTrack {
  letter: string;
  trackType: string;
  competitionDate: string;
}

interface Awarding {
  id?: number;
  name: string;
  sortOrder: number;
  tracks: AwardingTrack[];
}

export default function AwardingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [awardings, setAwardings] = useState<Awarding[]>([]);
  const [availableTracks, setAvailableTracks] = useState<TrackOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [bookingName, setBookingName] = useState("");

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    try {
      const [bookingRes, tracksRes, awardingsRes] = await Promise.all([
        fetch(`/api/bookings/${id}`),
        fetch(`/api/competitions/${id}/tracks`),
        fetch(`/api/awardings/${id}`),
      ]);

      if (bookingRes.ok) {
        const b = await bookingRes.json();
        setBookingName(b.organizerName);
      }

      if (tracksRes.ok) {
        setAvailableTracks(await tracksRes.json());
      }

      if (awardingsRes.ok) {
        const data = await awardingsRes.json();
        setAwardings(
          data.map((a: Awarding & { id: number }) => ({
            id: a.id,
            name: a.name,
            sortOrder: a.sortOrder,
            tracks: a.tracks.map((t: AwardingTrack) => ({
              letter: t.letter,
              trackType: t.trackType,
              competitionDate: t.competitionDate,
            })),
          }))
        );
      }
    } catch {
      setMessage({ type: "error", text: "Andmete laadimine ebaõnnestus" });
    } finally {
      setLoading(false);
    }
  }

  function addAwarding() {
    setAwardings([
      ...awardings,
      {
        name: "",
        sortOrder: awardings.length + 1,
        tracks: [],
      },
    ]);
  }

  function removeAwarding(index: number) {
    if (!confirm("Kas soovid selle autasustamise eemaldada?")) return;
    setAwardings(awardings.filter((_, i) => i !== index));
  }

  function updateAwardingName(index: number, name: string) {
    const updated = [...awardings];
    updated[index] = { ...updated[index], name };
    setAwardings(updated);
  }

  function toggleTrack(awardingIndex: number, track: TrackOption) {
    const updated = [...awardings];
    const awarding = updated[awardingIndex];
    const trackKey = `${track.letter}-${track.trackType}-${track.competitionDate}`;
    const existing = awarding.tracks.findIndex(
      (t) =>
        `${t.letter}-${t.trackType}-${t.competitionDate}` === trackKey
    );

    if (existing >= 0) {
      awarding.tracks = awarding.tracks.filter((_, i) => i !== existing);
    } else {
      awarding.tracks = [
        ...awarding.tracks,
        {
          letter: track.letter,
          trackType: track.trackType,
          competitionDate: track.competitionDate,
        },
      ];
    }

    setAwardings(updated);
  }

  function isTrackSelected(awardingIndex: number, track: TrackOption): boolean {
    return awardings[awardingIndex].tracks.some(
      (t) =>
        t.letter === track.letter &&
        t.trackType === track.trackType &&
        t.competitionDate === track.competitionDate
    );
  }

  async function handleSave() {
    // Validate
    for (let i = 0; i < awardings.length; i++) {
      if (!awardings[i].name.trim()) {
        setMessage({ type: "error", text: `Autasustamine #${i + 1}: nimi on kohustuslik` });
        return;
      }
      if (awardings[i].tracks.length === 0) {
        setMessage({ type: "error", text: `Autasustamine "${awardings[i].name}": vali v\u00e4hemalt 1 rada` });
        return;
      }
    }

    setSaving(true);
    setMessage(null);

    try {
      const payload = awardings.map((a, i) => ({
        name: a.name,
        sortOrder: i + 1,
        tracks: a.tracks,
      }));

      const res = await fetch(`/api/awardings/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ awardings: payload }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Autasustamised salvestatud!" });
        fetchData();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Salvestamine eba\u00f5nnestus" });
      }
    } catch {
      setMessage({ type: "error", text: "Serveri viga" });
    } finally {
      setSaving(false);
    }
  }

  // Group available tracks by date
  const tracksByDate = availableTracks.reduce<Record<string, TrackOption[]>>((acc, track) => {
    const date = track.competitionDate.split("T")[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(track);
    return acc;
  }, {});

  // Deduplicate tracks by letter+trackType+date (different sizes share same letter/type/date)
  const uniqueTracksByDate = Object.entries(tracksByDate).reduce<Record<string, TrackOption[]>>(
    (acc, [date, tracks]) => {
      const seen = new Set<string>();
      acc[date] = tracks.filter((t) => {
        const key = `${t.letter}-${t.trackType}-${t.competitionDate}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return acc;
    },
    {}
  );

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-48 bg-gray-200 rounded" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/organizer/competition/${id}`} className="text-blue-600 hover:text-blue-700 text-sm">
              &larr; Tagasi
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Autasustamine</h1>
          {bookingName && <p className="text-sm text-gray-600">{bookingName}</p>}
        </div>
        <button
          onClick={addAwarding}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Lisa autasustamine
        </button>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {availableTracks.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center mb-6">
          <p className="text-gray-500">
            Radasid pole veel lisatud. Lisa esmalt rajad v\u00f5istluse seadistuses.
          </p>
        </div>
      )}

      {/* Awarding Cards */}
      {awardings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">
            \u00dchtegi autasustamist pole lisatud. Vajuta &quot;+ Lisa autasustamine&quot; alustamiseks.
          </p>
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          {awardings.map((awarding, awardingIdx) => (
            <div key={awardingIdx} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900">
                  Autasustamine #{awardingIdx + 1}
                </h3>
                <button
                  onClick={() => removeAwarding(awardingIdx)}
                  className="text-sm text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                >
                  Eemalda
                </button>
              </div>

              {/* Name field */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nimetus <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={awarding.name}
                  onChange={(e) => updateAwardingName(awardingIdx, e.target.value)}
                  placeholder="nt. Agility kokkuv\u00f5te, Jumping kokkuv\u00f5te"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Track checkboxes grouped by date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rajad <span className="text-red-500">*</span>
                </label>
                {Object.keys(uniqueTracksByDate).length === 0 ? (
                  <p className="text-sm text-gray-400">Radasid pole saadaval</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(uniqueTracksByDate)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([date, tracks]) => (
                        <div key={date}>
                          <p className="text-xs font-medium text-gray-500 mb-1">
                            {new Date(date).toLocaleDateString("et-EE", {
                              weekday: "short",
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {tracks.map((track) => {
                              const selected = isTrackSelected(awardingIdx, track);
                              return (
                                <label
                                  key={`${track.letter}-${track.trackType}-${track.competitionDate}`}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                                    selected
                                      ? "bg-blue-50 border-blue-300 text-blue-700"
                                      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => toggleTrack(awardingIdx, track)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  {track.letter} - {track.trackType}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
                {awarding.tracks.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Valitud: {awarding.tracks.length} rada
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save button */}
      {awardings.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Salvestamine..." : "Salvesta"}
          </button>
        </div>
      )}
    </div>
  );
}
