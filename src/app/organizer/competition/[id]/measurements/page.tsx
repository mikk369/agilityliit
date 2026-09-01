"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import type { DogSummary } from "@/types";
import { classFromCm, dogSizeCode, MIN_MEASUREMENT_CM, MAX_MEASUREMENT_CM } from "@/lib/dog-sizes";
import { refereeOptions } from "@/components/ui/RefereeList";

interface MeasurementsCompetitor {
  id: number;
  status: string;
  /** Flagged by the competitor at registration as still needing a measurement. */
  needsMeasurement: boolean;
  handler: { id: number; handlerName: string };
  dog: DogSummary;
}

interface Measurement {
  id: number;
  dogId: number;
  bookingId: number;
  referee: string;
  /** Resolved EKL class label, derived from measurementCm by the API. */
  measurementEst: string;
  /** Measured height in cm. Null on legacy free-text rows. */
  measurementCm: string | number | null;
  /** Resolved FCI class label, derived from measurementCm by the API. */
  measurementFci: string | null;
  createdAt: string;
  dog: DogSummary;
  handlerName?: string;
}

export default function MeasurementsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [competitors, setCompetitors] = useState<MeasurementsCompetitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [bookingName, setBookingName] = useState("");
  // The competition's own referees, offered instead of retyping the name for
  // every dog measured on the day.
  const [referees, setReferees] = useState<string[]>([]);

  // Form state
  const [selectedDogId, setSelectedDogId] = useState<string>("");
  const [referee, setReferee] = useState("");
  const [measurementCm, setMeasurementCm] = useState("");

  // Class is derived from the measured height and shown before saving.
  const derivedEst = classFromCm(measurementCm, "EST");
  const derivedFci = classFromCm(measurementCm, "FCI");

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
        const names = refereeOptions(b.referee);
        setReferees(names);
        // One referee usually measures the whole day, so preselect them.
        if (names.length === 1) setReferee(names[0]);
      }

      if (measurementsRes.ok) {
        setMeasurements(await measurementsRes.json());
      }

      if (competitorsRes.ok) {
        const comps: MeasurementsCompetitor[] = await competitorsRes.json();
        // Only accepted competitors
        setCompetitors(comps.filter((c) => c.status === "ACCEPTED"));
      }
    } catch {
      setMessage({ type: "error", text: "Andmete laadimine ebaõnnestus" });
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

  // Consolidated worklist: every dog flagged as needing a measurement, gathered
  // in one place so the referee doesn't have to hunt through each registration.
  // A dog drops off once its class is confirmed (two agreeing measurements set
  // sizeOfficial). The "Mõõdetud" count shows how many measurements it has so
  // far, mirroring the WordPress "0x" column.
  const measurementCountByDog = new Map<number, number>();
  for (const m of measurements) {
    measurementCountByDog.set(m.dogId, (measurementCountByDog.get(m.dogId) ?? 0) + 1);
  }

  const SIZE_ORDER = ["XS", "S", "M", "SL", "L"];
  const dogsNeedingMeasurement = (() => {
    const seen = new Set<number>();
    const rows: {
      dogId: number;
      dogName: string;
      breed: string | null;
      handlerName: string;
      sizeCode: string;
      sizeEst: string | null;
      count: number;
    }[] = [];
    for (const c of competitors) {
      if (!c.needsMeasurement) continue;
      if (seen.has(c.dog.id)) continue;
      // A confirmed official class means the dog no longer needs measuring.
      if (c.dog.sizeOfficial) continue;
      seen.add(c.dog.id);
      rows.push({
        dogId: c.dog.id,
        dogName: c.dog.nickName,
        breed: c.dog.breed ?? null,
        handlerName: c.handler.handlerName,
        sizeCode: dogSizeCode(c.dog.sizeEst),
        sizeEst: c.dog.sizeEst ?? null,
        count: measurementCountByDog.get(c.dog.id) ?? 0,
      });
    }
    return rows.sort((a, b) => {
      const sa = SIZE_ORDER.indexOf(a.sizeCode);
      const sb = SIZE_ORDER.indexOf(b.sizeCode);
      if (sa !== sb) return (sa === -1 ? 99 : sa) - (sb === -1 ? 99 : sb);
      return a.dogName.localeCompare(b.dogName);
    });
  })();

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
    const cm = parseFloat(measurementCm.replace(",", "."));
    if (!Number.isFinite(cm) || cm < MIN_MEASUREMENT_CM || cm > MAX_MEASUREMENT_CM) {
      setMessage({
        type: "error",
        text: `Sisesta mõõdetud kõrgus vahemikus ${MIN_MEASUREMENT_CM}-${MAX_MEASUREMENT_CM} cm`,
      });
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
          measurementCm: cm,
        }),
      });

      if (res.ok) {
        // Two agreeing measurements are what actually change the dog's class.
        const created = await res.json();
        setMessage({
          type: "success",
          text: created?.sizeOfficial
            ? `Mõõtmine lisatud! Koera võistlusklass kinnitatud: ${created.sizeOfficial}`
            : "Mõõtmine lisatud! Klassi kinnitamiseks on vaja kahte sama tulemust.",
        });
        setSelectedDogId("");
        setMeasurementCm("");
        // Keep referee value for convenience (same referee usually does multiple)
        fetchData();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Lisamine ebaõnnestus" });
      }
    } catch {
      setMessage({ type: "error", text: "Serveri viga" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(measurementId: number, dogName: string) {
    if (!confirm(`Kas eemalda "${dogName}" mõõtmine?`)) return;

    try {
      const res = await fetch(`/api/dog-measurements/single/${measurementId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Mõõtmine eemaldatud" });
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
        <h1 className="text-2xl font-bold text-gray-900">Mõõtmised</h1>
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

      {/* Consolidated worklist of dogs still needing a measurement */}
      <div className="bg-amber-50 rounded-xl border border-amber-200 overflow-hidden mb-6">
        <div className="px-4 py-3 bg-amber-100/60 border-b border-amber-200">
          <h2 className="text-lg font-semibold text-amber-900">
            Mõõtmist vajavad koerad ({dogsNeedingMeasurement.length})
          </h2>
        </div>
        {dogsNeedingMeasurement.length === 0 ? (
          <div className="p-6 text-center text-sm text-amber-800/80">
            Ühtegi mõõtmist vajavat koera pole.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-200 text-left">
                  <th className="px-4 py-3 font-medium text-amber-800">Suurus</th>
                  <th className="px-4 py-3 font-medium text-amber-800">Koer</th>
                  <th className="px-4 py-3 font-medium text-amber-800">Koerajuht</th>
                  <th className="px-4 py-3 font-medium text-amber-800">Mõõdetud</th>
                </tr>
              </thead>
              <tbody>
                {dogsNeedingMeasurement.map((d) => (
                  <tr
                    key={d.dogId}
                    className="border-b border-amber-100 last:border-0 hover:bg-amber-100/40 cursor-pointer"
                    onClick={() => setSelectedDogId(String(d.dogId))}
                    title="Vali mõõtmise lisamiseks"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {d.sizeCode || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{d.dogName}</div>
                      {d.breed && <div className="text-xs text-gray-500">{d.breed}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-900">{d.handlerName}</td>
                    <td className="px-4 py-3 text-gray-700">{d.count}×</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add measurement form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Lisa mõõtmine</h2>
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
              {referees.length > 0 ? (
                <select
                  value={referee}
                  onChange={(e) => setReferee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Vali kohtunik...</option>
                  {referees.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={referee}
                  onChange={(e) => setReferee(e.target.value)}
                  placeholder="Kohtuniku nimi"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              )}
            </div>

            {/* Measured height -> class */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kõrgus (cm) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min={MIN_MEASUREMENT_CM}
                max={MAX_MEASUREMENT_CM}
                value={measurementCm}
                onChange={(e) => setMeasurementCm(e.target.value)}
                placeholder="nt. 38.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {derivedEst && (
                <p className="mt-1 text-xs text-gray-600">
                  EKL: <span className="font-medium">{derivedEst}</span>, FCI:{" "}
                  <span className="font-medium">{derivedFci}</span>
                </p>
              )}
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
          <p className="text-xs text-gray-500">
            Koera võistlusklassi muudab alles kaks sama klassi mõõtmistulemust. Kui teine
            mõõtmine annab esimesest erineva klassi, klass ei muutu.
          </p>
        </form>
      </div>

      {/* Measurements table */}
      {measurements.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">
            Mõõtmisi pole veel lisatud.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Mõõtmised ({measurements.length})
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
                  <th className="px-4 py-3 font-medium text-gray-600">Kinnitatud klass</th>
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
                        {m.measurementCm ? `${m.measurementCm} cm` : m.measurementEst || "-"}
                      </span>
                      {m.measurementCm && (
                        <div className="mt-1 text-xs text-gray-500">
                          EKL {m.measurementEst}
                          {m.measurementFci ? `, FCI ${m.measurementFci}` : ""}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {m.dog.sizeOfficial ? (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          {m.dog.sizeOfficial}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">kinnitamata</span>
                      )}
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
