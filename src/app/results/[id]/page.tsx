"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import type { ResultsResponse } from "./types";
import { TrackResultCard } from "./TrackResultCard";
import { exportResultsToPDF, getUniqueDates } from "./resultsPdf";

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
