"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

interface Competitor {
  id: number;
  status: string;
  remarks: string | null;
  needsMeasurement: boolean;
  needsCompetitionBook: boolean;
  createdAt: string;
  handler: {
    id: number;
    handlerName: string;
    clubName: string | null;
    country: string | null;
  };
  dog: {
    id: number;
    nickName: string;
    sizeEst: string | null;
    sizeFci: string | null;
    agilityClass: string | null;
    jumpClass: string | null;
    breed: string | null;
  };
  competitorTracks: {
    competitionTrack: {
      id: number;
      letter: string;
      trackType: string;
      size: string;
      competitionType: string;
      competitionDate: string;
    };
  }[];
}

export default function CompetitorTablePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
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
            <button
              onClick={() => exportCompetitorsToExcel(bookingName, competitors)}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
            >
              Excel
            </button>
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

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

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

      {displayed.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">
            {competitors.length === 0
              ? "Ühtegi võistlejat pole veel registreerunud."
              : "Selle filtriga võistlejaid ei leitud."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="px-4 py-3 font-medium text-gray-600">#</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Koerajuht</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Koer</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Suurus</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Klass</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Rajad</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Staatus</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Tegevused</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((comp, idx) => (
                  <tr key={comp.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{comp.handler.handlerName}</div>
                      <div className="text-xs text-gray-500">
                        {[comp.handler.clubName, comp.handler.country].filter(Boolean).join(" · ")}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{comp.dog.nickName}</div>
                      {comp.dog.breed && (
                        <div className="text-xs text-gray-500">{comp.dog.breed}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {comp.dog.sizeEst && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                          {comp.dog.sizeEst}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {comp.dog.agilityClass && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                            {comp.dog.agilityClass}
                          </span>
                        )}
                        {comp.dog.jumpClass && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">
                            {comp.dog.jumpClass}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {comp.competitorTracks.map((ct, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                          >
                            {ct.competitionTrack.letter} ({ct.competitionTrack.competitionType})
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={comp.status} />
                      <div className="flex gap-1 mt-1">
                        {comp.needsMeasurement && (
                          <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">Mõõtmine</span>
                        )}
                        {comp.needsCompetitionBook && (
                          <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">V-raamat</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {comp.status === "PENDING" ? (
                          <button
                            onClick={() => handleStatusChange(comp.id, "ACCEPTED")}
                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                          >
                            Kinnita
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStatusChange(comp.id, "PENDING")}
                            className="px-2 py-1 text-xs text-yellow-700 hover:bg-yellow-50 rounded transition-colors"
                          >
                            Ootele
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(comp.id, comp.handler.handlerName)}
                          className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          Eemalda
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

async function exportCompetitorsToExcel(bookingName: string, competitors: Competitor[]) {
  const XLSX = await import("xlsx");
  const data = [["Koerajuht", "Klubi", "Riik", "Koer", "Tõug", "Suurus (EST)", "Agility", "Jumping", "Rajad", "Staatus", "Märkused"]];

  for (const c of competitors) {
    const tracks = c.competitorTracks
      .map((ct) => `${ct.competitionTrack.letter} (${ct.competitionTrack.trackType})`)
      .join(", ");
    data.push([
      c.handler.handlerName,
      c.handler.clubName || "",
      c.handler.country || "",
      c.dog.nickName,
      c.dog.breed || "",
      c.dog.sizeEst || "",
      c.dog.agilityClass || "",
      c.dog.jumpClass || "",
      tracks,
      c.status === "ACCEPTED" ? "Kinnitatud" : "Ootel",
      c.remarks || "",
    ]);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Võistlejad");
  XLSX.writeFile(wb, `Voistlejad_${bookingName}.xlsx`);
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

function StatusBadge({ status }: { status: string }) {
  if (status === "ACCEPTED") {
    return (
      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
        Kinnitatud
      </span>
    );
  }
  return (
    <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
      Ootel
    </span>
  );
}
