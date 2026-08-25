"use client";

import { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import type { CompetitionTrack } from "@/types";

interface ProtocolCompetitor {
  id: number;
  status: string;
  handler: { id: number; handlerName: string; clubName: string | null };
  dog: { id: number; nickName: string; sizeEst: string | null; sizeFci: string | null; agilityClass: string | null; jumpClass: string | null };
  competitorTracks: { competitionTrack: CompetitionTrack }[];
}

interface ProtocolEntry {
  id?: number;
  competitorId: number;
  competitionTrackId: number;
  competitionDate: string;
  size: string;
  startNumber: number;
  sortOrder: number;
  competitor?: ProtocolCompetitor;
  competitionTrack?: CompetitionTrack;
}

interface ProtocolResponse {
  id?: number;
  published?: boolean;
  entries: ProtocolEntry[];
}

export default function ProtocolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [bookingName, setBookingName] = useState("");
  const [tracks, setTracks] = useState<CompetitionTrack[]>([]);
  const [competitors, setCompetitors] = useState<ProtocolCompetitor[]>([]);
  const [protocolEntries, setProtocolEntries] = useState<ProtocolEntry[]>([]);
  const [published, setPublished] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
  const [editingStartNumber, setEditingStartNumber] = useState<{ index: number; value: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [bookingRes, tracksRes, compRes, protocolRes] = await Promise.all([
        fetch(`/api/bookings/${id}`),
        fetch(`/api/competitions/${id}/tracks`),
        fetch(`/api/competitors/booking/${id}`),
        fetch(`/api/start-protocol/${id}`),
      ]);

      if (bookingRes.ok) {
        const b = await bookingRes.json();
        setBookingName(b.organizerName);
      }

      let loadedTracks: CompetitionTrack[] = [];
      if (tracksRes.ok) {
        loadedTracks = await tracksRes.json();
        setTracks(loadedTracks);
      }

      if (compRes.ok) {
        const allCompetitors: ProtocolCompetitor[] = await compRes.json();
        setCompetitors(allCompetitors.filter((c) => c.status === "ACCEPTED"));
      }

      if (protocolRes.ok) {
        const protocol: ProtocolResponse = await protocolRes.json();
        setProtocolEntries(protocol.entries || []);
        setPublished(protocol.published ?? false);
      } else {
        setProtocolEntries([]);
        setPublished(false);
      }

      if (loadedTracks.length > 0 && !selectedTrackId) {
        setSelectedTrackId(loadedTracks[0].id);
      }
    } catch {
      setMessage({ type: "error", text: "Andmete laadimine ebaonnestus" });
    } finally {
      setLoading(false);
    }
  }, [id, selectedTrackId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group tracks by date
  const tracksByDate = tracks.reduce<Record<string, CompetitionTrack[]>>((acc, track) => {
    const date = track.competitionDate;
    if (!acc[date]) acc[date] = [];
    acc[date].push(track);
    return acc;
  }, {});

  const sortedDates = Object.keys(tracksByDate).sort();

  // Get entries for the selected track, sorted by sortOrder
  const currentEntries = protocolEntries
    .filter((e) => e.competitionTrackId === selectedTrackId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Find competitor data for a protocol entry
  function getCompetitorForEntry(entry: ProtocolEntry): ProtocolCompetitor | undefined {
    if (entry.competitor) return entry.competitor;
    return competitors.find((c) => c.id === entry.competitorId);
  }

  // Generate protocol from accepted competitors for the selected track
  function handleGenerate() {
    if (!selectedTrackId) return;

    const selectedTrack = tracks.find((t) => t.id === selectedTrackId);
    if (!selectedTrack) return;

    // Find competitors registered for this track
    const trackCompetitors = competitors.filter((c) =>
      c.competitorTracks.some((ct) => ct.competitionTrack.id === selectedTrackId)
    );

    if (trackCompetitors.length === 0) {
      setMessage({ type: "error", text: "Selle raja jaoks pole kinnitatud voistlejaid" });
      return;
    }

    // Check if entries already exist for this track
    const existingForTrack = protocolEntries.filter((e) => e.competitionTrackId === selectedTrackId);
    if (existingForTrack.length > 0) {
      if (!confirm("Selle raja protokoll on juba olemas. Kas soovid selle ule kirjutada?")) {
        return;
      }
    }

    // Remove old entries for this track, keep entries for other tracks
    const otherEntries = protocolEntries.filter((e) => e.competitionTrackId !== selectedTrackId);

    // Create new entries
    const newEntries: ProtocolEntry[] = trackCompetitors.map((comp, idx) => ({
      competitorId: comp.id,
      competitionTrackId: selectedTrackId,
      competitionDate: selectedTrack.competitionDate,
      size: comp.dog.sizeEst || comp.dog.sizeFci || "",
      startNumber: idx + 1,
      sortOrder: idx + 1,
    }));

    setProtocolEntries([...otherEntries, ...newEntries]);
    setMessage({ type: "success", text: `Protokoll genereeritud: ${newEntries.length} voistlejat` });
  }

  // Generate protocol for ALL tracks at once
  function handleGenerateAll() {
    if (tracks.length === 0) return;

    const totalBefore = protocolEntries.length;
    if (totalBefore > 0) {
      if (!confirm("Koikide radade protokollid kirjutatakse ule. Kas jatkata?")) {
        return;
      }
    }

    const allNewEntries: ProtocolEntry[] = [];

    for (const track of tracks) {
      const trackCompetitors = competitors.filter((c) =>
        c.competitorTracks.some((ct) => ct.competitionTrack.id === track.id)
      );

      trackCompetitors.forEach((comp, idx) => {
        allNewEntries.push({
          competitorId: comp.id,
          competitionTrackId: track.id,
          competitionDate: track.competitionDate,
          size: comp.dog.sizeEst || comp.dog.sizeFci || "",
          startNumber: idx + 1,
          sortOrder: idx + 1,
        });
      });
    }

    setProtocolEntries(allNewEntries);
    setMessage({ type: "success", text: `Protokoll genereeritud koikidele radadele: ${allNewEntries.length} kirjet` });
  }

  // Move entry up or down
  function moveEntry(index: number, direction: "up" | "down") {
    const trackEntries = [...currentEntries];
    const swapIndex = direction === "up" ? index - 1 : index + 1;

    if (swapIndex < 0 || swapIndex >= trackEntries.length) return;

    // Swap sortOrder values
    const tempSort = trackEntries[index].sortOrder;
    trackEntries[index] = { ...trackEntries[index], sortOrder: trackEntries[swapIndex].sortOrder };
    trackEntries[swapIndex] = { ...trackEntries[swapIndex], sortOrder: tempSort };

    // Swap start numbers too
    const tempStart = trackEntries[index].startNumber;
    trackEntries[index] = { ...trackEntries[index], startNumber: trackEntries[swapIndex].startNumber };
    trackEntries[swapIndex] = { ...trackEntries[swapIndex], startNumber: tempStart };

    // Update the main entries array
    const otherEntries = protocolEntries.filter((e) => e.competitionTrackId !== selectedTrackId);
    setProtocolEntries([...otherEntries, ...trackEntries]);
  }

  // Edit start number inline
  function startEditNumber(index: number, currentValue: number) {
    setEditingStartNumber({ index, value: String(currentValue) });
  }

  function commitEditNumber() {
    if (!editingStartNumber) return;
    const { index, value } = editingStartNumber;
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) {
      setEditingStartNumber(null);
      return;
    }

    const trackEntries = currentEntries.map((entry, i) =>
      i === index ? { ...entry, startNumber: num } : entry
    );

    const otherEntries = protocolEntries.filter((e) => e.competitionTrackId !== selectedTrackId);
    setProtocolEntries([...otherEntries, ...trackEntries]);
    setEditingStartNumber(null);
  }

  // Save protocol
  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/start-protocol/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: protocolEntries }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Stardiprotokoll salvestatud!" });
        const data = await res.json();
        if (data.entries) {
          setProtocolEntries(data.entries);
        }
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Salvestamine ebaonnestus" });
      }
    } catch {
      setMessage({ type: "error", text: "Serveri viga" });
    } finally {
      setSaving(false);
    }
  }

  // Toggle publish
  async function handleTogglePublish() {
    try {
      const res = await fetch(`/api/start-protocol/${id}/publish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !published }),
      });

      if (res.ok) {
        setPublished(!published);
        setMessage({
          type: "success",
          text: !published ? "Stardiprotokoll avaldatud!" : "Stardiprotokoll peidetud",
        });
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Avaldamine ebaonnestus" });
      }
    } catch {
      setMessage({ type: "error", text: "Serveri viga" });
    }
  }

  function formatDate(dateStr: string) {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("et-EE", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return dateStr;
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-10 bg-gray-200 rounded w-96" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/organizer/competition/${id}`} className="text-blue-600 hover:text-blue-700 text-sm">
              &larr; Tagasi
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Stardiprotokoll</h1>
          {bookingName && <p className="text-sm text-gray-600">{bookingName}</p>}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleTogglePublish}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              published
                ? "bg-green-100 text-green-700 border border-green-300 hover:bg-green-200"
                : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
            }`}
          >
            {published ? "Avaldatud" : "Avaldamata"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || protocolEntries.length === 0}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Salvestab..." : "Salvesta"}
          </button>
        </div>
      </div>

      {/* Message */}
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

      {/* Track selector */}
      {tracks.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">Voistlusele pole radasid lisatud.</p>
        </div>
      ) : (
        <>
          <div className="mb-6 space-y-3">
            {sortedDates.map((date) => (
              <div key={date}>
                <p className="text-xs font-medium text-gray-500 mb-1.5">{formatDate(date)}</p>
                <div className="flex flex-wrap gap-2">
                  {tracksByDate[date]
                    .sort((a, b) => a.letter.localeCompare(b.letter))
                    .map((track) => {
                      const entryCount = protocolEntries.filter(
                        (e) => e.competitionTrackId === track.id
                      ).length;
                      return (
                        <FilterButton
                          key={track.id}
                          active={selectedTrackId === track.id}
                          onClick={() => setSelectedTrackId(track.id)}
                        >
                          {track.letter} - {track.competitionType}
                          {track.size && ` (${track.size})`}
                          {entryCount > 0 && (
                            <span className="ml-1.5 bg-white/30 px-1.5 py-0.5 rounded text-xs">
                              {entryCount}
                            </span>
                          )}
                        </FilterButton>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>

          {/* Generate buttons */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={handleGenerate}
              disabled={!selectedTrackId}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Genereeri protokoll (valitud rada)
            </button>
            <button
              onClick={handleGenerateAll}
              className="px-4 py-2 text-sm bg-indigo-100 text-indigo-700 border border-indigo-300 rounded-lg hover:bg-indigo-200 transition-colors"
            >
              Genereeri koik rajad
            </button>
          </div>

          {/* Protocol table */}
          {selectedTrackId && (
            <>
              {currentEntries.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <p className="text-gray-500">
                    Selle raja jaoks pole protokolli. Vajuta &quot;Genereeri protokoll&quot; nuppu.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 text-left">
                          <th className="px-4 py-3 font-medium text-gray-600 w-20">Start nr</th>
                          <th className="px-4 py-3 font-medium text-gray-600">Koerajuht</th>
                          <th className="px-4 py-3 font-medium text-gray-600">Koer</th>
                          <th className="px-4 py-3 font-medium text-gray-600 w-24">Suurus</th>
                          <th className="px-4 py-3 font-medium text-gray-600 w-28">Klass</th>
                          <th className="px-4 py-3 font-medium text-gray-600 w-32">Jarjestus</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentEntries.map((entry, idx) => {
                          const comp = getCompetitorForEntry(entry);
                          return (
                            <tr key={`${entry.competitorId}-${entry.competitionTrackId}`} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="px-4 py-3">
                                {editingStartNumber?.index === idx ? (
                                  <input
                                    type="number"
                                    min={1}
                                    value={editingStartNumber.value}
                                    onChange={(e) =>
                                      setEditingStartNumber({ index: idx, value: e.target.value })
                                    }
                                    onBlur={commitEditNumber}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") commitEditNumber();
                                      if (e.key === "Escape") setEditingStartNumber(null);
                                    }}
                                    autoFocus
                                    className="w-16 px-2 py-1 border border-blue-400 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                                  />
                                ) : (
                                  <button
                                    onClick={() => startEditNumber(idx, entry.startNumber)}
                                    className="w-10 h-8 flex items-center justify-center font-semibold text-gray-900 bg-gray-100 rounded hover:bg-blue-100 hover:text-blue-700 transition-colors cursor-pointer"
                                    title="Kliki muutmiseks"
                                  >
                                    {entry.startNumber}
                                  </button>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {comp ? (
                                  <>
                                    <div className="font-medium text-gray-900">{comp.handler.handlerName}</div>
                                    {comp.handler.clubName && (
                                      <div className="text-xs text-gray-500">{comp.handler.clubName}</div>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-gray-400">--</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {comp ? (
                                  <div className="font-medium text-gray-900">{comp.dog.nickName}</div>
                                ) : (
                                  <span className="text-gray-400">--</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {comp?.dog.sizeEst && (
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                                    {comp.dog.sizeEst}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-1">
                                  {comp?.dog.agilityClass && (
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                                      {comp.dog.agilityClass}
                                    </span>
                                  )}
                                  {comp?.dog.jumpClass && (
                                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">
                                      {comp.dog.jumpClass}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => moveEntry(idx, "up")}
                                    disabled={idx === 0}
                                    className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="Liiguta ules"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => moveEntry(idx, "down")}
                                    disabled={idx === currentEntries.length - 1}
                                    className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="Liiguta alla"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      Kokku: {currentEntries.length} voistlejat
                    </p>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {saving ? "Salvestab..." : "Salvesta"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm rounded-lg transition-colors ${
        active
          ? "bg-blue-600 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}
