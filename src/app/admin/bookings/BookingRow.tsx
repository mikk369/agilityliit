"use client";

import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { AdminBooking } from "./types";

export function BookingRow({
  booking,
  busy,
  onApprove,
  onDelete,
}: {
  booking: AdminBooking;
  busy: boolean;
  onApprove: (booking: AdminBooking) => void;
  onDelete: (booking: AdminBooking) => void;
}) {
  const dates =
    booking.startDate === booking.endDate
      ? formatDate(booking.startDate)
      : `${formatDate(booking.startDate)} – ${formatDate(booking.endDate)}`;

  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
      <td className="px-4 py-3 whitespace-nowrap text-gray-900">{dates}</td>
      <td className="px-4 py-3">{booking.clubName}</td>
      <td className="px-4 py-3">{booking.organizerName}</td>
      <td className="px-4 py-3">{booking.location}</td>
      <td className="px-4 py-3 text-gray-500">{booking.competitionOfficiality}</td>
      <td className="px-4 py-3">
        <StatusBadge status={booking.status} />
      </td>
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
        {booking.regStatus === "reg_open"
          ? "Avatud"
          : booking.regStatus === "reg_closed"
            ? "Suletud"
            : "–"}
        {booking.regCloseDate && (
          <span className="block text-xs">kuni {formatDate(booking.regCloseDate)}</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          {booking.status === "PENDING" && (
            <button
              onClick={() => onApprove(booking)}
              disabled={busy}
              className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              Kinnita
            </button>
          )}
          <Link
            href={`/organizer/competition/${booking.id}`}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200 transition-colors"
          >
            Ava
          </Link>
          <button
            onClick={() => onDelete(booking)}
            disabled={busy}
            className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            Kustuta
          </button>
        </div>
      </td>
    </tr>
  );
}
