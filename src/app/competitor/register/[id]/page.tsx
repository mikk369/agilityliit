"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Dog {
  id: number;
  nickName: string;
  officialName: string | null;
  sizeEst: string | null;
  sizeFci: string | null;
  agilityClass: string | null;
  jumpClass: string | null;
  registerCode: string | null;
  idCode: string | null;
  generalVaccinationEnd: string | null;
  rabiesVaccinationEnd: string | null;
}

interface Track {
  id: number;
  competitionDate: string;
  letter: string;
  trackType: string;
  size: string;
  competitionType: string;
  referee: string | null;
  isRelay: boolean;
}

interface BookingInfo {
  id: number;
  organizerName: string;
  startDate: string;
  endDate: string;
  location: string;
  competitionType: string;
  regStatus: string | null;
  competitionTracks: Track[];
}

export default function RegisterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const bookingId = parseInt(id);

  const [step, setStep] = useState(1);
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [hasHandler, setHasHandler] = useState(true);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedDogId, setSelectedDogId] = useState<number | null>(null);
  const [selectedTrackIds, setSelectedTrackIds] = useState<number[]>([]);
  const [sizeStandard, setSizeStandard] = useState<"EST" | "FCI">("EST");
  const [needsMeasurement, setNeedsMeasurement] = useState(false);
  const [needsCompetitionBook, setNeedsCompetitionBook] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [bookingRes, dogsRes, handlerRes] = await Promise.all([
          fetch(`/api/bookings/${bookingId}`),
          fetch("/api/dogs/me"),
          fetch("/api/handlers/me"),
        ]);

        if (bookingRes.ok) setBooking(await bookingRes.json());
        if (dogsRes.ok) setDogs(await dogsRes.json());
        if (handlerRes.status === 404) setHasHandler(false);
      } catch {
        setMessage({ type: "error", text: "Andmete laadimine ebaõnnestus" });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [bookingId]);

  const selectedDog = dogs.find((d) => d.id === selectedDogId);

  function isVaccinationValid(dog: Dog) {
    if (!booking) return false;
    const competitionStart = new Date(booking.startDate);
    const generalOk =
      dog.generalVaccinationEnd &&
      new Date(dog.generalVaccinationEnd) >= competitionStart;
    const rabiesOk =
      dog.rabiesVaccinationEnd &&
      new Date(dog.rabiesVaccinationEnd) >= competitionStart;
    return generalOk && rabiesOk;
  }

  async function handleSubmit() {
    if (!selectedDogId || selectedTrackIds.length === 0) return;
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          dogId: selectedDogId,
          trackIds: selectedTrackIds,
          sizeStandard,
          needsMeasurement,
          needsCompetitionBook,
          remarks: remarks || undefined,
          competitionDate: booking?.startDate,
        }),
      });

      if (res.ok) {
        router.push("/competitor/competitions");
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Registreerimine ebaõnnestus" });
      }
    } catch {
      setMessage({ type: "error", text: "Serveri viga" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-gray-500">Võistlust ei leitud.</p>
      </div>
    );
  }

  if (booking.regStatus === "reg_closed") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Registreerimine suletud</h1>
        <p className="text-gray-500">Selle võistluse registreerimine on suletud.</p>
      </div>
    );
  }

  if (!hasHandler) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Registreerumine võistlusele
        </h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            Registreerumiseks pead esmalt looma oma{" "}
            <Link href="/competitor/profile" className="underline font-medium">
              koerajuhi profiili
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  // Group tracks by date
  const tracksByDate = booking.competitionTracks.reduce(
    (acc, track) => {
      const date = track.competitionDate.split("T")[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(track);
      return acc;
    },
    {} as Record<string, Track[]>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        href={`/competitions/${booking.id}`}
        className="text-sm text-blue-600 hover:text-blue-700 mb-4 inline-block"
      >
        &larr; Tagasi võistluse juurde
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Registreerumine võistlusele
      </h1>
      <p className="text-gray-600 mb-6">
        {booking.organizerName} · {formatDate(booking.startDate)}
        {booking.startDate !== booking.endDate && ` – ${formatDate(booking.endDate)}`}
        {" · "}{booking.location}
      </p>

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

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s
                  ? "bg-blue-600 text-white"
                  : step > s
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-400"
              }`}
            >
              {step > s ? "✓" : s}
            </div>
            <span className={`text-sm ${step === s ? "text-gray-900 font-medium" : "text-gray-400"}`}>
              {s === 1 ? "Koer" : s === 2 ? "Rajad" : "Kinnitus"}
            </span>
            {s < 3 && <div className="w-8 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Step 1: Dog Selection */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Vali koer</h2>

          {dogs.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500 mb-3">Sul pole ühtegi koera lisatud.</p>
              <Link
                href="/competitor/dogs"
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Lisa koer
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {dogs.map((dog) => {
                const vaccineOk = isVaccinationValid(dog);
                return (
                  <label
                    key={dog.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedDogId === dog.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:bg-gray-50"
                    } ${!vaccineOk ? "opacity-60" : ""}`}
                  >
                    <input
                      type="radio"
                      name="dog"
                      value={dog.id}
                      checked={selectedDogId === dog.id}
                      onChange={() => setSelectedDogId(dog.id)}
                      disabled={!vaccineOk}
                      className="text-blue-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{dog.nickName}</span>
                        {dog.sizeEst && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{dog.sizeEst}</span>
                        )}
                        {dog.agilityClass && (
                          <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">{dog.agilityClass}</span>
                        )}
                        {dog.jumpClass && (
                          <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">{dog.jumpClass}</span>
                        )}
                      </div>
                      {dog.officialName && (
                        <p className="text-xs text-gray-500">{dog.officialName}</p>
                      )}
                      {!vaccineOk && (
                        <p className="text-xs text-red-600 mt-1">
                          Vaktsineerimise kehtivus ei kata võistluse kuupäevi
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Suuruse standard</label>
              <div className="flex gap-3">
                {(["EST", "FCI"] as const).map((std) => (
                  <label key={std} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="sizeStandard"
                      value={std}
                      checked={sizeStandard === std}
                      onChange={() => setSizeStandard(std)}
                      className="text-blue-600"
                    />
                    {std}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={needsMeasurement}
                onChange={(e) => setNeedsMeasurement(e.target.checked)}
                className="text-blue-600 rounded"
              />
              Vajab mõõtmist
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={needsCompetitionBook}
                onChange={(e) => setNeedsCompetitionBook(e.target.checked)}
                className="text-blue-600 rounded"
              />
              Vajab võistlusraamatut
            </label>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!selectedDogId}
              className="px-6 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Edasi
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Track Selection */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Vali rajad</h2>

          {Object.entries(tracksByDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, tracks]) => (
              <div key={date} className="mb-4 last:mb-0">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  {formatDate(date)}
                </h3>
                <div className="space-y-1">
                  {tracks.map((track) => (
                    <label
                      key={track.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedTrackIds.includes(track.id)
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTrackIds.includes(track.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTrackIds([...selectedTrackIds, track.id]);
                          } else {
                            setSelectedTrackIds(
                              selectedTrackIds.filter((id) => id !== track.id)
                            );
                          }
                        }}
                        className="text-blue-600 rounded"
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <span className="font-medium text-gray-900">
                          {track.letter}
                        </span>
                        <span className="text-sm text-gray-600">
                          {track.trackType}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          {track.size}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          {track.competitionType}
                        </span>
                        {track.isRelay && (
                          <span className="text-xs text-orange-600">(teateviis)</span>
                        )}
                        {track.referee && (
                          <span className="text-xs text-gray-400 ml-auto">
                            {track.referee}
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Märkused (valikuline)
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Lisainfo korraldajale..."
            />
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
            >
              Tagasi
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={selectedTrackIds.length === 0}
              className="px-6 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Edasi
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {step === 3 && selectedDog && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Registreerimise kokkuvõte
          </h2>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Võistlus</h3>
              <p className="font-medium text-gray-900">{booking.organizerName}</p>
              <p className="text-sm text-gray-600">
                {formatDate(booking.startDate)}
                {booking.startDate !== booking.endDate && ` – ${formatDate(booking.endDate)}`}
                {" · "}{booking.location}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Koer</h3>
              <p className="font-medium text-gray-900">{selectedDog.nickName}</p>
              <p className="text-sm text-gray-600">
                {[selectedDog.sizeEst && `Suurus: ${selectedDog.sizeEst}`,
                  selectedDog.agilityClass && `Agility: ${selectedDog.agilityClass}`,
                  selectedDog.jumpClass && `Jumping: ${selectedDog.jumpClass}`
                ].filter(Boolean).join(" · ")}
              </p>
              <p className="text-sm text-gray-600">Standard: {sizeStandard}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Valitud rajad</h3>
              <div className="space-y-1">
                {selectedTrackIds.map((trackId) => {
                  const track = booking.competitionTracks.find((t) => t.id === trackId);
                  if (!track) return null;
                  return (
                    <p key={trackId} className="text-sm text-gray-700">
                      {formatDate(track.competitionDate)} — Rada {track.letter} ({track.trackType}, {track.competitionType})
                    </p>
                  );
                })}
              </div>
            </div>

            {(needsMeasurement || needsCompetitionBook) && (
              <div className="p-4 bg-yellow-50 rounded-lg">
                {needsMeasurement && <p className="text-sm text-yellow-800">Vajab mõõtmist</p>}
                {needsCompetitionBook && <p className="text-sm text-yellow-800">Vajab võistlusraamatut</p>}
              </div>
            )}

            {remarks && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Märkused</h3>
                <p className="text-sm text-gray-700">{remarks}</p>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
            >
              Tagasi
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Registreerimine..." : "Kinnita registreerimine"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("et-EE");
}
