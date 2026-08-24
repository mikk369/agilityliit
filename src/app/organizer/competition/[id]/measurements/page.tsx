"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

interface Dog {
  id: number;
  nickName: string;
  sizeEst: string | null;
  breed: string | null;
}

interface Competitor {
  id: number;
  status: string;
  handler: {
    id: number;
    handlerName: string;
  };
  dog: Dog;
}

interface Measurement {
  id: number;
  dogId: number;
  bookingId: number;
  referee: string;
  measurement: string;
  createdAt: string;
  dog: {
    id: number;
    nickName: string;
    sizeEst: string | null;
    breed: string | null;
  };
  handlerName?: string;
}

export default function MeasurementsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [bookingName, setBookingName] = useState("");

  // Form state
  const [selectedDogId, setSelectedDogId] = useState<string>("");
  const [referee, setReferee] = useState("");
  const [measurementValue, setMeasurementValue] = useState("");

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    try {
      const [bookingRes, measurementsRes, competitorsRes] = await Promise.all([
        fetch(`/api/bookings/${id}`),
        fetch(`/api/dog-measurements/${id}`),
        fetch(`/api/competitors/booking/${id}`),
      ]);

      if (bookingRes.ok) {
        const b = await bookingRes.json();
        setBookingName(b.organizerName);
      }

      if (measurementsRes.ok) {
        setMeasurements(await measurementsRes.json());
      }

      if (competitorsRes.ok) {
        const comps: Competitor[] = await competitorsRes.json();
        // Only accepted competitors
        setCompetitors(comps.filter((c) => c.status === "ACCEPTED"));
      }
    } catch {
      setMessage({ type: "error", text: "Andmete laadimine eba\u00f5nnestus" });
    } finally {
      setLoading(false);
    }
  }

  // Build dog options with handler names (deduplicate by dogId)
  const dogOptions = (() => {
    const seen = new Set<number>();
    const options: { dogId: number; dogName: string; handlerName: string; sizeEst: string | null }[] = [];
    for (const c of competitors) {
      if (!seen.has(c.dog.id)) {
        seen.add(c.dog.id);
        options.push({
          dogId: c.dog.id,
          dogName: c.dog.nickName,
          handlerName: c.handler.handlerName,
          sizeEst: c.dog.sizeEst,
        });
      }
    }
    return options.sort((a, b) => a.dogName.localeCompare(b.dogName));
  })();

  // Build a map from dogId to handler name for the measurements table
  const dogHandlerMap = new Map<number, string>();
  for (const c of competitors) {
    if (!dogHandlerMap.has(c.dog.id)) {
      dogHandlerMap.set(c.dog.id, c.handler.handlerName);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedDogId) {
      setMessage({ type: "error", text: "Vali koer" });
      return;
    }
    if (!referee.trim()) {
      setMessage({ type: "error", text: "Sisesta kohtuniku nimi" });
      return;
    }
    if (!measurementValue.trim()) {
      setMessage({ type: "error", text: "Sisesta m\u00f5\u00f5tmise tulemus" });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/dog-measurements/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dogId: parseInt(selectedDogId),
          bookingId: parseInt(id),
          referee: referee.trim(),
          measurement: measurementValue.trim(),
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "M\u00f5\u00f5tmine lisatud!" });
        setSelectedDogId("");
        setMeasurementValue("");
        // Keep referee value for convenience (same referee usually does multiple)
        fetchData();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Lisamine eba\u00f5nnestus" });
      }
    } catch {
      setMessage({ type: "error", text: "Serveri viga" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(measurementId: number, dogName: string) {
    if (!confirm(`Kas eemalda "${dogName}" m\u00f5\u00f5tmine?`)) return;

    try {
      const res = await fetch(`/api/dog-measurements/single/${measurementId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMessage({ type: "success", text: "M\u00f5\u00f5tmine eemaldatud" });
        fetchData();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Eemaldamine eba\u00f5nnestus" });
      }
    } catch {
      setMessage({ type: "error", text: "Serveri viga" });
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-40 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Link href={`/organizer/competition/${id}`} className="text-blue-600 hover:text-blue-700 text-sm">
            &larr; Tagasi
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">M\u00f5\u00f5tmised</h1>
        {bookingName && <p className="text-sm text-gray-600">{bookingName}</p>}
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

      {/* Add measurement form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Lisa m\u00f5\u00f5tmine</h2>
        <form onSubmit={handleAdd}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Dog selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Koer <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedDogId}
                onChange={(e) => setSelectedDogId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Vali koer...</option>
                {dogOptions.map((opt) => (
                  <option key={opt.dogId} value={opt.dogId}>
                    {opt.dogName} ({opt.handlerName}){opt.sizeEst ? ` - ${opt.sizeEst}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Referee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kohtunik <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={referee}
                onChange={(e) => setReferee(e.target.value)}
                placeholder="Kohtuniku nimi"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Measurement result */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tulemus <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={measurementValue}
                onChange={(e) => setMeasurementValue(e.target.value)}
                placeholder="nt. 38cm, L, S"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Add button */}
            <div className="flex items-end">
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Lisamine..." : "Lisa"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Measurements table */}
      {measurements.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">
            M\u00f5\u00f5tmisi pole veel lisatud.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              M\u00f5\u00f5tmised ({measurements.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="px-4 py-3 font-medium text-gray-600">#</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Koer</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Koerajuht</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Kohtunik</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Tulemus</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Tegevused</th>
                </tr>
              </thead>
              <tbody>
                {measurements.map((m, idx) => (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{m.dog.nickName}</div>
                      {m.dog.breed && (
                        <div className="text-xs text-gray-500">{m.dog.breed}</div>
                      )}
                      {m.dog.sizeEst && (
                        <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                          {m.dog.sizeEst}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {dogHandlerMap.get(m.dogId) || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-900">{m.referee}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        {m.measurement}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(m.id, m.dog.nickName)}
                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        Eemalda
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
