"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface BookingDetail {
  id: number;
  startDate: string;
  endDate: string;
  organizerName: string;
  clubName: string;
  email: string;
  phone: string;
  location: string;
  competitionType: string;
  status: string;
  regStatus: string | null;
  regCloseDate: string | null;
  referee: string[] | null;
  info: string | null;
  competitionInfo: {
    descriptionEst: string | null;
    descriptionEng: string | null;
  } | null;
  competitionTracks: {
    id: number;
    competitionDate: string;
    letter: string;
    trackType: string;
    size: string;
    competitionType: string;
    referee: string | null;
    isRelay: boolean;
  }[];
}

export default function CompetitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/bookings/${id}`);
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
        <p className="text-gray-500">Võistlust ei leitud.</p>
      </div>
    );
  }

  const isOpen = booking.regStatus !== "reg_closed";
  const isPast = new Date(booking.endDate) < new Date();
  const isCompetitor = session?.user?.role === "COMPETITOR";

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
        &larr; Tagasi võistluste juurde
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {booking.organizerName}
            </h1>
            <div className="space-y-1 text-sm text-gray-600">
              <p>
                {formatDate(booking.startDate)}
                {booking.startDate !== booking.endDate &&
                  ` – ${formatDate(booking.endDate)}`}
              </p>
              <p>{booking.location}</p>
              <p>{booking.competitionType}</p>
              <p>Klubi: {booking.clubName}</p>
              <p>E-post: {booking.email}</p>
              <p>Telefon: {booking.phone}</p>
              {booking.referee && booking.referee.length > 0 && (
                <p>Kohtunikud: {booking.referee.join(", ")}</p>
              )}
            </div>
          </div>
          <div className="shrink-0">
            {!isPast && (
              <span
                className={`text-xs px-3 py-1 rounded-full ${
                  isOpen
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {isOpen ? "Registreerimine avatud" : "Registreerimine suletud"}
              </span>
            )}
          </div>
        </div>

        {session && isCompetitor && isOpen && !isPast && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Link
              href={`/competitor/register/${booking.id}`}
              className="inline-block px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Registreeru võistlusele
            </Link>
          </div>
        )}
      </div>

      {booking.competitionInfo?.descriptionEst && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Võistluse info
          </h2>
          <div
            className="prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{
              __html: booking.competitionInfo.descriptionEst,
            }}
          />
        </div>
      )}

      {Object.keys(tracksByDate).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Rajad</h2>
          {Object.entries(tracksByDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, tracks]) => (
              <div key={date} className="mb-4 last:mb-0">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  {formatDate(date)}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-medium text-gray-700">
                          Rada
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-gray-700">
                          Tüüp
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-gray-700">
                          Suurus
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-gray-700">
                          Klass
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-gray-700">
                          Kohtunik
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
                                (teateviis)
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3">{track.trackType}</td>
                          <td className="py-2 px-3">{track.size}</td>
                          <td className="py-2 px-3">{track.competitionType}</td>
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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("et-EE");
}
