"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

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

export default function OrganizerCompetitionsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    try {
      const res = await fetch("/api/bookings?mine=true");
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

  if (loading) return <LoadingSkeleton blocks={2} />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Minu võistlused</h1>
        <Link
          href="/organizer/new"
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Registreeri võistlus
        </Link>
      </div>

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
              ? "Sul pole ühtegi tulevast võistlust."
              : "Eelmisi võistlusi ei leitud."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((b) => (
            <CompetitionCard key={b.id} booking={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function CompetitionCard({ booking }: { booking: Booking }) {
  const isPast = new Date(booking.endDate) < new Date();
  const isOpen = booking.regStatus !== "reg_closed";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 text-lg">
              {booking.organizerName}
            </h3>
            <StatusBadge status={booking.status} />
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
        </div>
        <div className="shrink-0 flex flex-col gap-2">
          <Link
            href={`/organizer/competition/${booking.id}`}
            className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors text-center"
          >
            Halda
          </Link>
          <Link
            href={`/organizer/competition/${booking.id}/competitors`}
            className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-center"
          >
            Võistlejad
          </Link>
        </div>
      </div>
    </div>
  );
}

