"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface Booking {
  id: number;
  organizerName: string;
  startDate: string;
  endDate: string;
  location: string;
}

interface TrackWithCount {
  id: number;
  competitionDate: string;
  letter: string;
  trackType: string;
  size: string;
  competitionType: string;
  referee: string | null;
  competitorCount: number;
}

export default function ResultsOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [tracks, setTracks] = useState<TrackWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [bookingRes, tracksRes] = await Promise.all([
          fetch(`/api/bookings/${id}`),
          fetch(`/api/results/tracks/${id}`),
        ]);

        if (bookingRes.ok) {
          setBooking(await bookingRes.json());
        } else {
          setError("Võistlust ei leitud");
          return;
        }

        if (tracksRes.ok) {
          setTracks(await tracksRes.json());
        } else {
          setError("Radade laadimine ebaõnnestus");
        }
      } catch {
        setError("Andmete laadimine ebaõnnestus");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-gray-500">{error || "Võistlust ei leitud."}</p>
      </div>
    );
  }

  // Group tracks by date
  const tracksByDate: Record<string, TrackWithCount[]> = {};
  tracks.forEach((t) => {
    const date = t.competitionDate.split("T")[0];
    if (!tracksByDate[date]) tracksByDate[date] = [];
    tracksByDate[date].push(t);
  });

  const totalCompetitors = tracks.reduce((sum, t) => sum + t.competitorCount, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Link href={`/organizer/competition/${id}`} className="text-blue-600 hover:text-blue-700 text-sm">
          &larr; Tagasi
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Tulemused</h1>
      <p className="text-sm text-gray-600 mb-6">{booking.organizerName}</p>

      {/* Summary */}
      <div className="flex gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500">Radu kokku</p>
          <p className="text-lg font-semibold text-gray-900">{tracks.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500">Võistlejaid kokku</p>
          <p className="text-lg font-semibold text-gray-900">{totalCompetitors}</p>
        </div>
      </div>

      {/* Tracks by date */}
      {Object.keys(tracksByDate).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">Radu pole veel lisatud.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(tracksByDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, dateTracks]) => (
              <div key={date} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700">{formatDate(date)}</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {dateTracks.map((track) => (
                    <Link
                      key={track.id}
                      href={`/organizer/competition/${id}/results/${track.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-semibold text-gray-900 w-8">{track.letter}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{track.trackType}</span>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">{track.size}</span>
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">{track.competitionType}</span>
                          </div>
                          {track.referee && (
                            <p className="text-xs text-gray-500 mt-0.5">Kohtunik: {track.referee}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">
                          {track.competitorCount} võistleja{track.competitorCount !== 1 ? "t" : ""}
                        </span>
                        <svg
                          className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

