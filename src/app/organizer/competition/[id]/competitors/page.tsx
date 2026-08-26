"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import type { CompetitorEntry } from "@/types";
import { MessageBanner } from "@/components/ui/MessageBanner";
import { CompetitorTable } from "./CompetitorTable";
import { ExportButton } from "./ExportButton";

export default function CompetitorTablePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [competitors, setCompetitors] = useState<CompetitorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [filter, setFilter] = useState<"all" | "PENDING" | "ACCEPTED">("all");
  const [bookingName, setBookingName] = useState("");

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    try {
      const [compRes, bookingRes] = await Promise.all([
        fetch(`/api/competitors/booking/${id}`),
        fetch(`/api/bookings/${id}`),
      ]);

      if (compRes.ok) {
        setCompetitors(await compRes.json());
      }
      if (bookingRes.ok) {
        const b = await bookingRes.json();
        setBookingName(b.organizerName);
      }
    } catch {
      setMessage({ type: "error", text: "Andmete laadimine ebaõnnestus" });
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(competitorId: number, newStatus: string) {
    try {
      const res = await fetch(`/api/competitors/${competitorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: `Staatus muudetud: ${newStatus === "ACCEPTED" ? "Kinnitatud" : "Ootel"}` });
        fetchData();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Muutmine ebaõnnestus" });
      }
    } catch {
      setMessage({ type: "error", text: "Serveri viga" });
    }
  }

  async function handleAcceptAll() {
    const pending = competitors.filter((c) => c.status === "PENDING");
    if (pending.length === 0) return;
    if (!confirm(`Kinnita kõik ${pending.length} ootel võistlejat?`)) return;

    try {
      await Promise.all(
        pending.map((c) =>
          fetch(`/api/competitors/${c.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "ACCEPTED" }),
          })
        )
      );
      setMessage({ type: "success", text: `${pending.length} võistlejat kinnitatud!` });
      fetchData();
    } catch {
      setMessage({ type: "error", text: "Kinnitamine ebaõnnestus" });
    }
  }

  async function handleDelete(competitorId: number, name: string) {
    if (!confirm(`Kas eemalda "${name}" registreering?`)) return;
    try {
      const res = await fetch(`/api/competitors/${competitorId}`, { method: "DELETE" });
      if (res.ok) {
        setMessage({ type: "success", text: "Registreering eemaldatud" });
        fetchData();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Eemaldamine ebaõnnestus" });
      }
    } catch {
      setMessage({ type: "error", text: "Serveri viga" });
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  const pendingCount = competitors.filter((c) => c.status === "PENDING").length;
  const acceptedCount = competitors.filter((c) => c.status === "ACCEPTED").length;

  const displayed = filter === "all"
    ? competitors
    : competitors.filter((c) => c.status === filter);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/organizer/competition/${id}`} className="text-blue-600 hover:text-blue-700 text-sm">
              &larr; Tagasi
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Võistlejad</h1>
          {bookingName && <p className="text-sm text-gray-600">{bookingName}</p>}
        </div>
        <div className="flex gap-2">
          {competitors.length > 0 && (
            <ExportButton bookingName={bookingName} competitors={competitors} />
          )}
          {pendingCount > 0 && (
            <button
              onClick={handleAcceptAll}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
            >
              Kinnita kõik ({pendingCount})
            </button>
          )}
        </div>
      </div>

      <MessageBanner message={message} />

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
          Kõik ({competitors.length})
        </FilterButton>
        <FilterButton active={filter === "PENDING"} onClick={() => setFilter("PENDING")}>
          Ootel ({pendingCount})
        </FilterButton>
        <FilterButton active={filter === "ACCEPTED"} onClick={() => setFilter("ACCEPTED")}>
          Kinnitatud ({acceptedCount})
        </FilterButton>
      </div>

      <CompetitorTable
        competitors={displayed}
        totalCount={competitors.length}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
      />

      {displayed.some((c) => c.remarks) && (
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Märkused</h2>
          <div className="space-y-2">
            {displayed.filter((c) => c.remarks).map((c) => (
              <div key={c.id} className="text-sm">
                <span className="font-medium">{c.handler.handlerName}:</span>{" "}
                <span className="text-gray-600">{c.remarks}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm rounded-lg transition-colors ${
        active
          ? "bg-blue-600 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}
