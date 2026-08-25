"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import type { CompetitionTrack } from "@/types";

interface PublicResultHandler {
  id?: number;
  handlerName: string;
  clubName: string | null;
  country?: string | null;
}

interface PublicResultDog {
  id?: number;
  nickName: string;
  sizeEst: string | null;
  sizeFci?: string | null;
  agilityClass: string | null;
  jumpClass: string | null;
  breed: string | null;
}

interface PublicCompetitorResult {
  competitorId: number;
  handler: PublicResultHandler;
  dog: PublicResultDog;
  timeSeconds: number | null;
  faults: number;
  isDsq: boolean;
  isDns: boolean;
  hasQualification: boolean;
  notes: string | null;
}

interface TrackParameter {
  id?: number;
  sizeGroup: string;
  trackLength: number | null;
  trackSpeed: number | null;
  idealTime: number | null;
  maxTime: number | null;
}

interface TrackData {
  track: CompetitionTrack;
  parameters: TrackParameter[];
  competitors: PublicCompetitorResult[];
}

interface ResultsBooking {
  id: number;
  organizerName: string;
  clubName: string;
  location: string;
  startDate: string;
  endDate: string;
  competitionType: string;
  protocolPublished: number;
}

interface ResultsResponse {
  booking: ResultsBooking;
  tracks: TrackData[];
}

export default function PublicResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<ResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/results/public/${id}`);
        if (res.ok) {
          const result: ResultsResponse = await res.json();
          setData(result);

          // Set initial date filter
          if (result.tracks.length > 0) {
            const dates = getUniqueDates(result.tracks);
            if (dates.length > 0) {
              setSelectedDate(dates[0]);
            }
          }
        } else {
          const err = await res.json();
          setError(err.error || "Andmete laadimine ebaõnnestus");
        }
      } catch {
        setError("Serveri viga");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-72" />
          <div className="h-5 bg-gray-200 rounded w-48" />
          <div className="h-10 bg-gray-200 rounded w-64" />
          <div className="h-64 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link
          href="/competitions"
          className="text-sm text-blue-600 hover:text-blue-700 mb-4 inline-block"
        >
          &larr; Tagasi võistluste juurde
        </Link>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <svg
            className="w-12 h-12 text-gray-300 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <p className="text-gray-500 text-lg">
            {error || "Tulemusi ei leitud"}
          </p>
        </div>
      </div>
    );
  }

  const { booking, tracks } = data;
  const uniqueDates = getUniqueDates(tracks);
  const isMultiDay = uniqueDates.length > 1;

  // Filter tracks by selected date
  const filteredTracks = selectedDate
    ? tracks.filter(
        (t) =>
          new Date(t.track.competitionDate).toISOString().split("T")[0] ===
          selectedDate
      )
    : tracks;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link
        href="/competitions"
        className="text-sm text-blue-600 hover:text-blue-700 mb-4 inline-block"
      >
        &larr; Tagasi võistluste juurde
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Tulemused</h1>
            <p className="text-lg text-gray-700">{booking.organizerName}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
              <span>
                {formatDate(booking.startDate)}
                {booking.startDate !== booking.endDate &&
                  ` – ${formatDate(booking.endDate)}`}
              </span>
              <span>{booking.location}</span>
              {booking.clubName && <span>{booking.clubName}</span>}
              <span>{booking.competitionType}</span>
            </div>
          </div>
          {tracks.length > 0 && (
            <button
              onClick={() => exportResultsToPDF(booking, tracks)}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              PDF
            </button>
          )}
        </div>
      </div>

      {/* Date tabs for multi-day competitions */}
      {isMultiDay && (
        <div className="flex flex-wrap gap-2 mb-6">
          {uniqueDates.map((date) => (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                selectedDate === date
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {formatDate(date)}
            </button>
          ))}
        </div>
      )}

      {/* Track results */}
      {filteredTracks.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Tulemusi pole veel sisestatud.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredTracks.map((trackData) => (
            <TrackResultCard key={trackData.track.id} data={trackData} />
          ))}
        </div>
      )}
    </div>
  );
}

function TrackResultCard({ data }: { data: TrackData }) {
  const { track, parameters, competitors } = data;

  // Sort: DNS/DSQ last, then by time ascending
  const sorted = [...competitors].sort((a, b) => {
    // DNS and DSQ go last
    if (a.isDns || a.isDsq) {
      if (b.isDns || b.isDsq) return 0;
      return 1;
    }
    if (b.isDns || b.isDsq) return -1;

    // Both have times — sort ascending
    const timeA = a.timeSeconds ?? Infinity;
    const timeB = b.timeSeconds ?? Infinity;
    if (timeA !== timeB) return timeA - timeB;

    // Same time — fewer faults first
    return a.faults - b.faults;
  });

  // Calculate place numbers
  let place = 0;
  const places: (number | null)[] = sorted.map((comp) => {
    if (comp.isDns || comp.isDsq) return null;
    place++;
    return place;
  });

  // Find the ideal time for highlighting clean runs
  const idealTimeForSize =
    parameters.length > 0 ? parameters[0].idealTime : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Track header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg font-bold text-gray-900">
            {track.letter}
          </span>
          <span className="text-sm font-medium text-gray-700">
            {track.trackType}
          </span>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
            {track.size}
          </span>
          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
            {track.competitionType}
          </span>
          {track.isRelay && (
            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">
              Teateviis
            </span>
          )}
          {track.referee && (
            <span className="text-xs text-gray-500 ml-auto">
              Kohtunik: {track.referee}
            </span>
          )}
        </div>
      </div>

      {/* Track parameters */}
      {parameters.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
          <div className="overflow-x-auto">
            <table className="text-xs text-gray-600">
              <thead>
                <tr>
                  <th className="pr-4 py-1 font-medium text-left">Grupp</th>
                  <th className="pr-4 py-1 font-medium text-right">
                    Pikkus (m)
                  </th>
                  <th className="pr-4 py-1 font-medium text-right">
                    Kiirus (m/s)
                  </th>
                  <th className="pr-4 py-1 font-medium text-right">
                    Normiaeg (s)
                  </th>
                  <th className="py-1 font-medium text-right">Maksimaeg (s)</th>
                </tr>
              </thead>
              <tbody>
                {parameters.map((p) => (
                  <tr key={p.sizeGroup}>
                    <td className="pr-4 py-0.5 font-medium">{p.sizeGroup}</td>
                    <td className="pr-4 py-0.5 text-right">
                      {p.trackLength ?? "—"}
                    </td>
                    <td className="pr-4 py-0.5 text-right">
                      {p.trackSpeed ?? "—"}
                    </td>
                    <td className="pr-4 py-0.5 text-right">
                      {p.idealTime ?? "—"}
                    </td>
                    <td className="py-0.5 text-right">{p.maxTime ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results table */}
      {sorted.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-gray-500">Tulemusi pole veel sisestatud.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="px-4 py-2.5 font-medium text-gray-600 w-14">
                  Koht
                </th>
                <th className="px-4 py-2.5 font-medium text-gray-600">
                  Koerajuht
                </th>
                <th className="px-4 py-2.5 font-medium text-gray-600">Koer</th>
                <th className="px-4 py-2.5 font-medium text-gray-600 w-20">
                  Suurus
                </th>
                <th className="px-4 py-2.5 font-medium text-gray-600 w-24">
                  Klass
                </th>
                <th className="px-4 py-2.5 font-medium text-gray-600 w-20 text-right">
                  Aeg
                </th>
                <th className="px-4 py-2.5 font-medium text-gray-600 w-16 text-right">
                  Vead
                </th>
                <th className="px-4 py-2.5 font-medium text-gray-600 w-16 text-center">
                  Puhas
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((comp, idx) => {
                const isCleanRun =
                  !comp.isDsq &&
                  !comp.isDns &&
                  comp.faults === 0 &&
                  idealTimeForSize !== null &&
                  comp.timeSeconds !== null &&
                  comp.timeSeconds <= idealTimeForSize;

                return (
                  <tr
                    key={comp.competitorId}
                    className={`border-b border-gray-50 hover:bg-gray-50 ${
                      isCleanRun ? "bg-green-50/50" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5 font-semibold text-gray-900">
                      {places[idx] !== null ? places[idx] : ""}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-900">
                        {comp.handler.handlerName}
                      </div>
                      {comp.handler.clubName && (
                        <div className="text-xs text-gray-500">
                          {comp.handler.clubName}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-900">
                        {comp.dog.nickName}
                      </div>
                      {comp.dog.breed && (
                        <div className="text-xs text-gray-500">
                          {comp.dog.breed}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {comp.dog.sizeEst && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                          {comp.dog.sizeEst}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        {comp.dog.agilityClass && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                            {comp.dog.agilityClass}
                          </span>
                        )}
                        {comp.dog.jumpClass && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">
                            {comp.dog.jumpClass}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {comp.isDsq ? (
                        <span className="text-red-600 font-semibold">DSQ</span>
                      ) : comp.isDns ? (
                        <span className="text-orange-600 font-semibold">
                          DNS
                        </span>
                      ) : comp.timeSeconds !== null ? (
                        <span className="text-gray-900">
                          {comp.timeSeconds.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {!comp.isDsq && !comp.isDns && (
                        <span
                          className={
                            comp.faults > 0 ? "text-red-600" : "text-gray-900"
                          }
                        >
                          {comp.faults}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {comp.hasQualification && (
                        <svg
                          className="w-5 h-5 text-green-600 mx-auto"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function exportResultsToPDF(booking: ResultsBooking, tracks: TrackData[]) {
  let html = `<h1>Tulemused</h1>
    <h2>${booking.organizerName}</h2>
    <p>${formatDate(booking.startDate)}${booking.startDate !== booking.endDate ? ` – ${formatDate(booking.endDate)}` : ""} | ${booking.location}${booking.clubName ? ` | ${booking.clubName}` : ""} | ${booking.competitionType}</p>`;

  // Group by date
  const dates = getUniqueDates(tracks);
  for (const date of dates) {
    const dateTracks = tracks.filter(
      (t) => new Date(t.track.competitionDate).toISOString().split("T")[0] === date
    );
    if (dates.length > 1) {
      html += `<h3>${formatDate(date)}</h3>`;
    }

    for (const td of dateTracks) {
      const { track, parameters, competitors } = td;
      html += `<h4>${track.letter} - ${track.trackType} | ${track.size} | ${track.competitionType}${track.referee ? ` | Kohtunik: ${track.referee}` : ""}</h4>`;

      if (parameters.length > 0) {
        html += `<table class="params"><thead><tr><th>Grupp</th><th>Pikkus</th><th>Kiirus</th><th>Normiaeg</th><th>Maksimaeg</th></tr></thead><tbody>`;
        for (const p of parameters) {
          html += `<tr><td>${p.sizeGroup}</td><td>${p.trackLength ?? "—"}</td><td>${p.trackSpeed ?? "—"}</td><td>${p.idealTime ?? "—"}</td><td>${p.maxTime ?? "—"}</td></tr>`;
        }
        html += `</tbody></table>`;
      }

      const sorted = [...competitors].sort((a, b) => {
        if (a.isDns || a.isDsq) {
          if (b.isDns || b.isDsq) return 0;
          return 1;
        }
        if (b.isDns || b.isDsq) return -1;
        const ta = a.timeSeconds ?? Infinity;
        const tb = b.timeSeconds ?? Infinity;
        if (ta !== tb) return ta - tb;
        return a.faults - b.faults;
      });

      html += `<table><thead><tr><th>Koht</th><th>Koerajuht</th><th>Koer</th><th>Suurus</th><th>Klass</th><th>Aeg</th><th>Vead</th><th>Puhas</th></tr></thead><tbody>`;
      let place = 0;
      for (const c of sorted) {
        const p = (c.isDns || c.isDsq) ? "" : String(++place);
        const time = c.isDsq ? "DSQ" : c.isDns ? "DNS" : c.timeSeconds !== null ? c.timeSeconds.toFixed(2) : "—";
        html += `<tr>
          <td>${p}</td>
          <td>${c.handler.handlerName}${c.handler.clubName ? ` (${c.handler.clubName})` : ""}</td>
          <td>${c.dog.nickName}</td>
          <td>${c.dog.sizeEst || ""}</td>
          <td>${[c.dog.agilityClass, c.dog.jumpClass].filter(Boolean).join("/")}</td>
          <td>${time}</td>
          <td>${!c.isDsq && !c.isDns ? c.faults : ""}</td>
          <td>${c.hasQualification ? "JAH" : ""}</td>
        </tr>`;
      }
      html += `</tbody></table>`;
    }
  }

  const win = window.open("", "", "height=1000,width=1500");
  if (!win) return;
  win.document.write(`<html><head><title>Tulemused - ${booking.organizerName}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 11px; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      h2 { font-size: 14px; font-weight: normal; margin-top: 0; }
      h3 { font-size: 14px; margin-top: 20px; }
      h4 { font-size: 11px; margin-top: 16px; background: #f5f5f5; padding: 4px 8px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
      table.params { width: auto; margin-bottom: 4px; font-size: 10px; }
      th, td { padding: 3px 6px; text-align: left; border: 1px solid #ddd; }
      th { background: #f9f9f9; font-weight: 600; }
      tr:nth-child(even) { background: #fafafa; }
    </style>
  </head><body>${html}</body></html>`);
  win.document.close();
  win.print();
}

function getUniqueDates(tracks: TrackData[]): string[] {
  const dateSet = new Set<string>();
  for (const t of tracks) {
    const date = new Date(t.track.competitionDate)
      .toISOString()
      .split("T")[0];
    dateSet.add(date);
  }
  return Array.from(dateSet).sort();
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("et-EE");
}
