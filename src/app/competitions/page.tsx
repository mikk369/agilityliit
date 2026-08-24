"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Booking {
  id: number;
  startDate: string;
  endDate: string;
  organizerName: string;
  clubName: string;
  location: string;
  competitionType: string;
  status: string;
  regStatus: string | null;
  regCloseDate: string | null;
}

export default function CompetitionsPage() {
  const { data: session } = useSession();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    try {
      const res = await fetch("/api/bookings?status=BOOKED");
      if (res.ok) {
        setBookings(await res.json());
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  const now = new Date();
  const upcoming = bookings.filter((b) => new Date(b.endDate) >= now);
  const past = bookings.filter((b) => new Date(b.endDate) < now);
  const displayed = filter === "upcoming" ? upcoming : past;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-32 bg-gray-200 rounded" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Võistlused</h1>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter("upcoming")}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${
            filter === "upcoming"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Tulevased ({upcoming.length})
        </button>
        <button
          onClick={() => setFilter("past")}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${
            filter === "past"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Eelmised ({past.length})
        </button>
      </div>

      {displayed.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">
            {filter === "upcoming"
              ? "Hetkel pole ühtegi tulevast võistlust."
              : "Eelmisi võistlusi ei leitud."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((b) => (
            <CompetitionCard
              key={b.id}
              booking={b}
              isLoggedIn={!!session}
              isCompetitor={session?.user?.role === "COMPETITOR"}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CompetitionCard({
  booking,
  isLoggedIn,
  isCompetitor,
}: {
  booking: Booking;
  isLoggedIn: boolean;
  isCompetitor: boolean;
}) {
  const isOpen = booking.regStatus !== "reg_closed";
  const isPast = new Date(booking.endDate) < new Date();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 text-lg">
              {booking.organizerName}
            </h3>
            {!isPast && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  isOpen
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {isOpen ? "Reg. avatud" : "Reg. suletud"}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">
            {formatDate(booking.startDate)}
            {booking.startDate !== booking.endDate &&
              ` – ${formatDate(booking.endDate)}`}
          </p>
          <p className="text-sm text-gray-600">{booking.location}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
              {booking.competitionType}
            </span>
            <span className="text-xs text-gray-500">{booking.clubName}</span>
          </div>
          {booking.regCloseDate && isOpen && (
            <p className="text-xs text-gray-400 mt-1">
              Reg. sulgemise kuupäev: {formatDate(booking.regCloseDate)}
            </p>
          )}
        </div>
        <div className="shrink-0 flex flex-col gap-2">
          <Link
            href={`/competitions/${booking.id}`}
            className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-center"
          >
            Vaata
          </Link>
          {isLoggedIn && isCompetitor && isOpen && !isPast && (
            <Link
              href={`/competitor/register/${booking.id}`}
              className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors text-center"
            >
              Registreeru
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("et-EE");
}
