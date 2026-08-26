"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { MessageBanner } from "@/components/ui/MessageBanner";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { AdminTabs } from "@/components/AdminTabs";
import { BookingRow } from "./BookingRow";
import { AdminBooking, PAGE_SIZES, STATUS_FILTERS } from "./types";

/**
 * The bookings table that used to live in wp-admin (`../reactAdminPage`).
 * Approving a date reservation (PENDING -> BOOKED) is admin-only and happens
 * nowhere else in the app.
 */
export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);

  // Fetches, never sets state — the caller decides what to do with the rows.
  const loadBookings = useCallback(async (): Promise<AdminBooking[]> => {
    const res = await fetch(`/api/bookings${status ? `?status=${status}` : ""}`);
    if (!res.ok) throw new Error("Broneeringute laadimine ebaõnnestus");
    return res.json();
  }, [status]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const rows = await loadBookings();
        if (!cancelled) setBookings(rows);
      } catch {
        if (!cancelled) {
          setMessage({ type: "error", text: "Broneeringute laadimine ebaõnnestus" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadBookings]);

  async function refresh() {
    try {
      setBookings(await loadBookings());
    } catch {
      notify("error", "Broneeringute laadimine ebaõnnestus");
    }
  }

  function notify(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  async function approve(booking: AdminBooking) {
    if (!confirm(`Kinnitada "${booking.clubName}" võistlus?`)) return;

    setBusyId(booking.id);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "BOOKED" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      notify("success", "Broneering kinnitatud");
      await refresh();
    } catch (e) {
      notify("error", e instanceof Error && e.message ? e.message : "Kinnitamine ebaõnnestus");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(booking: AdminBooking) {
    if (!confirm(`Kustutada "${booking.clubName}" võistlus? Seda ei saa tagasi võtta.`)) return;

    setBusyId(booking.id);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      notify("success", "Broneering kustutatud");
      await refresh();
    } catch (e) {
      notify("error", e instanceof Error && e.message ? e.message : "Kustutamine ebaõnnestus");
    } finally {
      setBusyId(null);
    }
  }

  const pageCount = Math.max(1, Math.ceil(bookings.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = bookings.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pendingCount = bookings.filter((b) => b.status === "PENDING").length;

  if (loading) return <LoadingSkeleton titleWidth="w-64" blocks={1} blockHeight="h-64" />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Haldus</h1>
      <AdminTabs />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Broneeringud</h2>
          {pendingCount > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              {pendingCount} broneering(ut) ootab kinnitamist
            </p>
          )}
        </div>
        <Link
          href="/organizer/new"
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Lisa võistlus või klubiüritus
        </Link>
      </div>

      <MessageBanner message={message} />

      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setStatus(f.value);
                setPage(1);
              }}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                status === f.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-600">
          Kirjeid lehel
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase text-gray-500 bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium">Kuupäev</th>
              <th className="px-4 py-3 font-medium">Klubi</th>
              <th className="px-4 py-3 font-medium">Peakorraldaja</th>
              <th className="px-4 py-3 font-medium">Asukoht</th>
              <th className="px-4 py-3 font-medium">Võistlusliik</th>
              <th className="px-4 py-3 font-medium">Staatus</th>
              <th className="px-4 py-3 font-medium">Registreerimine</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Broneeringuid pole
                </td>
              </tr>
            ) : (
              visible.map((booking) => (
                <BookingRow
                  key={booking.id}
                  booking={booking}
                  busy={busyId === booking.id}
                  onApprove={approve}
                  onDelete={remove}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex justify-center gap-1 mt-4">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={`w-9 h-9 text-sm rounded-lg transition-colors ${
                n === currentPage
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
