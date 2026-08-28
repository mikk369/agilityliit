"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface Handler {
  handlerName: string;
  clubName: string | null;
  country: string | null;
}

interface Dog {
  nickName: string;
  breed: string | null;
  sizeEst: string | null;
  sizeFci: string | null;
  agilityClass: string | null;
  jumpClass: string | null;
}

interface Track {
  id: number;
  letter: string;
  trackType: string;
  size: string;
  officiality: string;
  competitionDate: string;
}

interface ProtocolEntry {
  id: number;
  competitorId: number;
  competitionTrackId: number;
  competitionDate: string;
  size: string;
  startNumber: number;
  sortOrder: number;
  competitor: {
    handler: Handler;
    dog: Dog;
  };
  competitionTrack: Track;
}

interface Booking {
  id: number;
  organizerName: string;
  clubName: string;
  location: string;
  startDate: string;
  endDate: string;
  protocolPublished: number;
}

interface ProtocolResponse {
  booking: Booking;
  entries: ProtocolEntry[];
}

export default function PublicStartProtocolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<ProtocolResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/start-protocol/public/${id}`);
        if (res.ok) {
          setData(await res.json());
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
            {error || "Stardiprotokoll pole veel avaldatud"}
          </p>
        </div>
      </div>
    );
  }

  const { booking, entries } = data;

  // Group entries by date, then by track
  const groupedByDate: Record<string, Record<string, ProtocolEntry[]>> = {};

  for (const entry of entries) {
    const date = entry.competitionDate
      ? new Date(entry.competitionDate).toISOString().split("T")[0]
      : "unknown";
    const trackKey = `${entry.competitionTrack.id}`;

    if (!groupedByDate[date]) groupedByDate[date] = {};
    if (!groupedByDate[date][trackKey]) groupedByDate[date][trackKey] = [];
    groupedByDate[date][trackKey].push(entry);
  }

  const sortedDates = Object.keys(groupedByDate).sort();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link
        href="/competitions"
        className="text-sm text-blue-600 hover:text-blue-700 mb-4 inline-block"
      >
        &larr; Tagasi võistluste juurde
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Stardiprotokoll
            </h1>
            <p className="text-lg text-gray-700">{booking.organizerName}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
              <span>
                {formatDate(booking.startDate)}
                {booking.startDate !== booking.endDate &&
                  ` – ${formatDate(booking.endDate)}`}
              </span>
              <span>{booking.location}</span>
              {booking.clubName && <span>{booking.clubName}</span>}
            </div>
          </div>
          {entries.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => exportProtocolToPDF(booking, groupedByDate, sortedDates)}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                PDF
              </button>
              <button
                onClick={() => exportProtocolToExcel(booking, entries)}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Excel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Entries grouped by date and track */}
      {entries.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">
            Stardiprotokolli kirjeid pole veel lisatud.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map((date) => {
            const tracksForDate = groupedByDate[date];
            // Sort tracks by letter
            const sortedTrackKeys = Object.keys(tracksForDate).sort((a, b) => {
              const trackA = tracksForDate[a][0].competitionTrack;
              const trackB = tracksForDate[b][0].competitionTrack;
              return trackA.letter.localeCompare(trackB.letter);
            });

            return (
              <div key={date}>
                {sortedDates.length > 1 && (
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    {formatDate(date)}
                  </h2>
                )}

                <div className="space-y-6">
                  {sortedTrackKeys.map((trackKey) => {
                    const trackEntries = tracksForDate[trackKey];
                    const track = trackEntries[0].competitionTrack;

                    return (
                      <div
                        key={trackKey}
                        className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                      >
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
                              {track.officiality}
                            </span>
                            <span className="text-xs text-gray-400 ml-auto">
                              {trackEntries.length} võistlejat
                            </span>
                          </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200 text-left">
                                <th className="px-4 py-2.5 font-medium text-gray-600 w-16">
                                  Nr
                                </th>
                                <th className="px-4 py-2.5 font-medium text-gray-600">
                                  Koerajuht
                                </th>
                                <th className="px-4 py-2.5 font-medium text-gray-600">
                                  Koer
                                </th>
                                <th className="px-4 py-2.5 font-medium text-gray-600">
                                  Tõug
                                </th>
                                <th className="px-4 py-2.5 font-medium text-gray-600 w-24">
                                  Suurus
                                </th>
                                <th className="px-4 py-2.5 font-medium text-gray-600 w-28">
                                  Klass
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {trackEntries
                                .sort((a, b) => a.sortOrder - b.sortOrder)
                                .map((entry) => (
                                  <tr
                                    key={entry.id}
                                    className="border-b border-gray-50 hover:bg-gray-50"
                                  >
                                    <td className="px-4 py-2.5 font-semibold text-gray-900">
                                      {entry.startNumber}
                                    </td>
                                    <td className="px-4 py-2.5">
                                      <div className="font-medium text-gray-900">
                                        {entry.competitor.handler.handlerName}
                                      </div>
                                      {entry.competitor.handler.clubName && (
                                        <div className="text-xs text-gray-500">
                                          {entry.competitor.handler.clubName}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-4 py-2.5 font-medium text-gray-900">
                                      {entry.competitor.dog.nickName}
                                    </td>
                                    <td className="px-4 py-2.5 text-gray-600">
                                      {entry.competitor.dog.breed || "—"}
                                    </td>
                                    <td className="px-4 py-2.5">
                                      {entry.competitor.dog.sizeEst && (
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                                          {entry.competitor.dog.sizeEst}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2.5">
                                      <div className="flex gap-1">
                                        {entry.competitor.dog.agilityClass && (
                                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                                            {entry.competitor.dog.agilityClass}
                                          </span>
                                        )}
                                        {entry.competitor.dog.jumpClass && (
                                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">
                                            {entry.competitor.dog.jumpClass}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function exportProtocolToPDF(
  booking: Booking,
  groupedByDate: Record<string, Record<string, ProtocolEntry[]>>,
  sortedDates: string[]
) {
  let html = `<h1>Stardiprotokoll</h1>
    <h2>${booking.organizerName}</h2>
    <p>${formatDate(booking.startDate)}${booking.startDate !== booking.endDate ? ` – ${formatDate(booking.endDate)}` : ""} | ${booking.location}${booking.clubName ? ` | ${booking.clubName}` : ""}</p>`;

  for (const date of sortedDates) {
    const tracksForDate = groupedByDate[date];
    if (sortedDates.length > 1) {
      html += `<h3>${formatDate(date)}</h3>`;
    }
    const sortedTrackKeys = Object.keys(tracksForDate).sort((a, b) => {
      const ta = tracksForDate[a][0].competitionTrack;
      const tb = tracksForDate[b][0].competitionTrack;
      return ta.letter.localeCompare(tb.letter);
    });

    for (const trackKey of sortedTrackKeys) {
      const trackEntries = tracksForDate[trackKey].sort((a, b) => a.sortOrder - b.sortOrder);
      const track = trackEntries[0].competitionTrack;
      html += `<h4>${track.letter} - ${track.trackType} | ${track.size} | ${track.officiality}</h4>`;
      html += `<table><thead><tr><th>Nr</th><th>Koerajuht</th><th>Klubi</th><th>Koer</th><th>Tõug</th><th>Suurus</th><th>Klass</th></tr></thead><tbody>`;
      for (const e of trackEntries) {
        html += `<tr>
          <td>${e.startNumber}</td>
          <td>${e.competitor.handler.handlerName}</td>
          <td>${e.competitor.handler.clubName || ""}</td>
          <td>${e.competitor.dog.nickName}</td>
          <td>${e.competitor.dog.breed || ""}</td>
          <td>${e.competitor.dog.sizeEst || ""}</td>
          <td>${[e.competitor.dog.agilityClass, e.competitor.dog.jumpClass].filter(Boolean).join("/")}</td>
        </tr>`;
      }
      html += `</tbody></table>`;
    }
  }

  const win = window.open("", "", "height=1000,width=1500");
  if (!win) return;
  win.document.write(`<html><head><title>Stardiprotokoll - ${booking.organizerName}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      h2 { font-size: 14px; font-weight: normal; margin-top: 0; }
      h3 { font-size: 14px; margin-top: 20px; }
      h4 { font-size: 12px; margin-top: 16px; background: #f5f5f5; padding: 4px 8px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
      th, td { padding: 4px 8px; text-align: left; border: 1px solid #ddd; }
      th { background: #f9f9f9; font-weight: 600; }
      tr:nth-child(even) { background: #fafafa; }
    </style>
  </head><body>${html}</body></html>`);
  win.document.close();
  win.print();
}

async function exportProtocolToExcel(booking: Booking, entries: ProtocolEntry[]) {
  const XLSX = await import("xlsx");
  const data = [["Nr", "Koerajuht", "Klubi", "Koer", "Tõug", "Suurus", "Klass", "Rada", "Kuupäev"]];
  const sorted = [...entries].sort((a, b) => {
    const dc = a.competitionDate.localeCompare(b.competitionDate);
    if (dc !== 0) return dc;
    const lc = a.competitionTrack.letter.localeCompare(b.competitionTrack.letter);
    if (lc !== 0) return lc;
    return a.sortOrder - b.sortOrder;
  });

  for (const e of sorted) {
    data.push([
      String(e.startNumber),
      e.competitor.handler.handlerName,
      e.competitor.handler.clubName || "",
      e.competitor.dog.nickName,
      e.competitor.dog.breed || "",
      e.competitor.dog.sizeEst || "",
      [e.competitor.dog.agilityClass, e.competitor.dog.jumpClass].filter(Boolean).join("/"),
      `${e.competitionTrack.letter} ${e.competitionTrack.trackType}`,
      formatDate(e.competitionDate),
    ]);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Stardiprotokoll");
  XLSX.writeFile(wb, `Stardiprotokoll_${booking.organizerName}.xlsx`);
}

