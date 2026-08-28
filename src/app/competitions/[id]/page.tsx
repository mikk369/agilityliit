"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/i18n/LanguageContext";
import { formatDate } from "@/lib/utils";
import type { PublicCompetitionDetail } from "@/types";

export default function CompetitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const { t, locale } = useTranslation();
  const [booking, setBooking] = useState<PublicCompetitionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // The public endpoint, not /api/bookings/[id]: this page is the landing
        // target for every click in the WordPress calendar, including clicks by
        // visitors with no session at all.
        const res = await fetch(`/api/public/competitions/${id}`);
        if (res.ok) setBooking(await res.json());
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-500">{t.compDetailNotFound}</p>
      </div>
    );
  }

  // Server-computed by isRegistrationOpen() — the same rule POST /api/competitors
  // enforces, so the page can never promise something the API will refuse.
  const isOpen = booking.registrationOpen;
  const isPending = booking.status === "PENDING";
  const isClubEvent = booking.status === "CLUBEVENT";
  const isPast = new Date(booking.endDate) < new Date();
  const isCompetitor = session?.user?.role === "COMPETITOR";

  const statusBadge = isPending
    ? { label: t.compDetailPending, className: "bg-amber-100 text-amber-700" }
    : isClubEvent
      ? { label: t.compDetailClubEvent, className: "bg-purple-100 text-purple-700" }
      : isPast
        ? { label: t.compDetailEnded, className: "bg-gray-100 text-gray-600" }
        : isOpen
          ? { label: t.compDetailRegOpen, className: "bg-green-100 text-green-700" }
          : { label: t.compDetailRegClosed, className: "bg-red-100 text-red-700" };

  // Show description based on language
  const description = locale === "en" && booking.competitionInfo?.descriptionEng
    ? booking.competitionInfo.descriptionEng
    : booking.competitionInfo?.descriptionEst;

  // Group tracks by date
  const tracksByDate = booking.competitionTracks.reduce(
    (acc, track) => {
      const date = track.competitionDate.split("T")[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(track);
      return acc;
    },
    {} as Record<string, typeof booking.competitionTracks>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href="/competitions"
        className="text-sm text-blue-600 hover:text-blue-700 mb-4 inline-block"
      >
        &larr; {t.compDetailBack}
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {booking.organizerName}
            </h1>
            <div className="space-y-1 text-sm text-gray-600">
              <p>
                {formatDate(booking.startDate, locale)}
                {booking.startDate !== booking.endDate &&
                  ` – ${formatDate(booking.endDate, locale)}`}
              </p>
              <p>{booking.location}</p>
              <p>{booking.competitionOfficiality}</p>
              <p>{t.compDetailClub}: {booking.clubName}</p>
              <p>{t.compDetailEmail}: {booking.email}</p>
              <p>{t.compDetailPhone}: {booking.phone}</p>
              {booking.referee && booking.referee.length > 0 && (
                <p>{t.compDetailJudges}: {booking.referee.join(", ")}</p>
              )}
            </div>
          </div>
          <div className="shrink-0">
            <span
              className={`text-xs px-3 py-1 rounded-full whitespace-nowrap ${statusBadge.className}`}
            >
              {statusBadge.label}
            </span>
          </div>
        </div>

        {isPending && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              {t.compDetailPendingText}
            </p>
          </div>
        )}

        {session && isCompetitor && isOpen && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Link
              href={`/competitor/register/${booking.id}`}
              className="inline-block px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t.compDetailRegister}
            </Link>
          </div>
        )}
      </div>

      {description && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            {t.compDetailInfo}
          </h2>
          <div
            className="prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: description }}
          />
        </div>
      )}

      {Object.keys(tracksByDate).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.compDetailTracks}</h2>
          {Object.entries(tracksByDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, tracks]) => (
              <div key={date} className="mb-4 last:mb-0">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  {formatDate(date, locale)}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-medium text-gray-700">
                          {t.compDetailTrack}
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-gray-700">
                          {t.compDetailCompClass}
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-gray-700">
                          {t.compDetailSizeGroup}
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-gray-700">
                          {t.compDetailOfficiality}
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-gray-700">
                          {t.compDetailJudge}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tracks.map((track) => (
                        <tr
                          key={track.id}
                          className="border-b border-gray-50 last:border-0"
                        >
                          <td className="py-2 px-3 font-medium">
                            {track.letter}
                            {track.isRelay && (
                              <span className="ml-1 text-xs text-orange-600">
                                {t.relay}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3">{track.trackType}</td>
                          <td className="py-2 px-3">{track.size}</td>
                          <td className="py-2 px-3">{track.officiality}</td>
                          <td className="py-2 px-3 text-gray-500">
                            {track.referee || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
