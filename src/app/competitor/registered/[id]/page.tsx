"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useTranslation } from "@/i18n/LanguageContext";
import { formatDate } from "@/lib/utils";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

interface Entry {
  id: number;
  status: string;
  booking: {
    id: number;
    startDate: string;
    endDate: string;
    organizerName: string;
    location: string;
    competitionOfficiality: string;
  };
  dog: { id: number; nickName: string };
  competitorTracks: {
    competitionTrack: {
      letter: string;
      trackType: string;
      size: string;
      officiality: string;
      competitionDate: string;
    };
  }[];
}

/**
 * Confirmation after registering for a competition: what was entered, and
 * where to go next. Reached from the registration form, and safe to revisit —
 * it reads the entries back rather than trusting anything passed in.
 */
export default function RegisteredPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const bookingId = parseInt(id);
  const { t, locale } = useTranslation();

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async (): Promise<Entry[]> => {
    const res = await fetch("/api/competitors/my-bookings");
    if (!res.ok) throw new Error("failed");
    const all: Entry[] = await res.json();
    return all.filter((e) => e.booking.id === bookingId);
  }, [bookingId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const rows = await loadEntries();
        if (!cancelled) setEntries(rows);
      } catch {
        // The registration itself succeeded; an empty list is handled below.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadEntries]);

  if (loading) return <LoadingSkeleton titleWidth="w-64" blockHeight="h-48" />;

  const booking = entries[0]?.booking;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-green-600"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.registeredTitle}</h1>
        <p className="text-gray-600">{t.registeredText}</p>

        {booking && (
          <p className="text-sm text-gray-500 mt-4">
            {booking.organizerName} — {formatDate(booking.startDate, locale)}
            {booking.startDate !== booking.endDate &&
              ` – ${formatDate(booking.endDate, locale)}`}
            {booking.location ? ` | ${booking.location}` : ""}
          </p>
        )}
      </div>

      {entries.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t.registeredEntries}
          </h2>

          <div className="space-y-4">
            {entries.map((entry) => (
              <div key={entry.id} className="border border-gray-100 rounded-lg p-4">
                <p className="font-medium text-gray-900">{entry.dog.nickName}</p>
                <ul className="mt-2 space-y-1">
                  {entry.competitorTracks.map((ct, i) => (
                    <li key={i} className="text-sm text-gray-600">
                      {t.regTrack(
                        formatDate(ct.competitionTrack.competitionDate, locale),
                        ct.competitionTrack.letter,
                        ct.competitionTrack.trackType,
                        ct.competitionTrack.size,
                        ct.competitionTrack.officiality
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3 mt-6">
        <Link
          href="/competitor/competitions"
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t.registeredMyCompetitions}
        </Link>
        <Link
          href={`/competitions/${bookingId}`}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
        >
          {t.registeredBackToCompetition}
        </Link>
      </div>
    </div>
  );
}
