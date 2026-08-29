"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/i18n/LanguageContext";
import { isTrackEligible } from "@/lib/track-eligibility";
import { formatDate } from "@/lib/utils";
import type { DogRegistration, CompetitionTrack } from "@/types";
import { MessageBanner } from "@/components/ui/MessageBanner";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

interface BookingInfo {
  id: number;
  organizerName: string;
  startDate: string;
  endDate: string;
  location: string;
  officiality: string;
  regStatus: string | null;
  competitionTracks: CompetitionTrack[];
}

export default function RegisterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { t, locale } = useTranslation();
  const bookingId = parseInt(id);

  const [step, setStep] = useState(1);
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [dogs, setDogs] = useState<DogRegistration[]>([]);
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
  // The organizer's per-day start limit, and how much of it is taken.
  const [capacity, setCapacity] = useState<{
    maxPerDay: Record<string, number>;
    registeredPerDay: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [bookingRes, dogsRes, handlerRes, capacityRes] = await Promise.all([
          fetch(`/api/bookings/${bookingId}`),
          fetch("/api/dogs/me"),
          fetch("/api/handlers/me"),
          fetch(`/api/competitions/${bookingId}/capacity`),
        ]);

        if (bookingRes.ok) setBooking(await bookingRes.json());
        if (dogsRes.ok) setDogs(await dogsRes.json());
        if (handlerRes.status === 404) setHasHandler(false);
        if (capacityRes.ok) setCapacity(await capacityRes.json());
      } catch {
        setMessage({ type: "error", text: t.loadFailed });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [bookingId]);

  const selectedDog = dogs.find((d) => d.id === selectedDogId);

  function isVaccinationValid(dog: DogRegistration) {
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

  /**
   * How full a competition day is. A day with no limit is never full — the
   * organizer sets the limit per day, not for the whole competition.
   */
  function dayCapacity(date: string) {
    const max = capacity?.maxPerDay[date];
    if (!max) return null;
    const registered = capacity?.registeredPerDay[date] ?? 0;
    return {
      max,
      registered,
      isFull: registered >= max,
      left: Math.max(0, max - registered),
    };
  }

  async function handleSubmit() {
    if (!selectedDogId || selectedTrackIds.length === 0) return;

    // A day may have filled up while this form was open. Dropping those tracks
    // here keeps the entry from being refused wholesale by the API.
    const trackIds = selectedTrackIds.filter((tid) => {
      const track = booking?.competitionTracks.find((t) => t.id === tid);
      return track ? !dayCapacity(track.competitionDate.split("T")[0])?.isFull : false;
    });
    if (trackIds.length === 0) {
      setMessage({ type: "error", text: t.regDayFull });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          dogId: selectedDogId,
          trackIds,
          sizeStandard,
          needsMeasurement,
          needsCompetitionBook,
          remarks: remarks || undefined,
          competitionDate: booking?.startDate,
        }),
      });

      if (res.ok) {
        router.push(`/competitor/registered/${bookingId}`);
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || t.regFailed });
      }
    } catch {
      setMessage({ type: "error", text: t.serverError });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingSkeleton titleWidth="w-64" blockHeight="h-64" />;

  if (!booking) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-gray-500">{t.regNotFound}</p>
      </div>
    );
  }

  if (booking.regStatus === "reg_closed") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{t.regClosed}</h1>
        <p className="text-gray-500">{t.regClosedText}</p>
      </div>
    );
  }

  if (!hasHandler) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {t.regTitle}
        </h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            {t.regNeedProfile}{" "}
            <Link href="/competitor/profile" className="underline font-medium">
              {t.regHandlerProfile}
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  // Only the tracks this dog may enter: its size, and no class above the one it
  // has reached. Without a dog picked yet nothing is eligible.
  const eligibleTracks = selectedDog
    ? booking.competitionTracks.filter((track) => isTrackEligible(track, selectedDog))
    : [];

  // Group tracks by date
  const tracksByDate = eligibleTracks.reduce(
    (acc, track) => {
      const date = track.competitionDate.split("T")[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(track);
      return acc;
    },
    {} as Record<string, CompetitionTrack[]>
  );

  // A track on a full day cannot be entered, so a selection must not survive
  // one either: POST /api/competitors refuses the whole entry, and the entrant
  // would only see an error at the last step.
  const blockedTrackIds = new Set(
    Object.entries(tracksByDate)
      .filter(([date]) => dayCapacity(date)?.isFull)
      .flatMap(([, dayTracks]) => dayTracks.map((track) => track.id))
  );
  const enterableTrackIds = selectedTrackIds.filter((tid) => !blockedTrackIds.has(tid));

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        href={`/competitions/${booking.id}`}
        className="text-sm text-blue-600 hover:text-blue-700 mb-4 inline-block"
      >
        &larr; {t.regBackToComp}
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        {t.regTitle}
      </h1>
      <p className="text-gray-600 mb-6">
        {booking.organizerName} · {formatDate(booking.startDate, locale)}
        {booking.startDate !== booking.endDate && ` – ${formatDate(booking.endDate, locale)}`}
        {" · "}{booking.location}
      </p>

      <MessageBanner message={message} />

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
              {s === 1 ? t.regStepDog : s === 2 ? t.regStepTracks : t.regStepConfirm}
            </span>
            {s < 3 && <div className="w-8 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Step 1: Dog Selection */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.regSelectDog}</h2>

          {dogs.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500 mb-3">{t.regNoDogs}</p>
              <Link
                href="/competitor/dogs"
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                {t.regAddDog}
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
                      onChange={() => {
                        setSelectedDogId(dog.id);
                        // Eligibility is per dog, so a previous dog's tracks
                        // must not survive the switch.
                        setSelectedTrackIds([]);
                      }}
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
                          {t.regVaccInvalid}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.regSizeStandard}</label>
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
              {t.regNeedsMeasurement}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={needsCompetitionBook}
                onChange={(e) => setNeedsCompetitionBook(e.target.checked)}
                className="text-blue-600 rounded"
              />
              {t.regNeedsBook}
            </label>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!selectedDogId}
              className="px-6 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {t.next}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Track Selection */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.regSelectTracks}</h2>

          {Object.keys(tracksByDate).length === 0 && (
            <p className="text-sm text-gray-500">{t.regNoEligibleTracks}</p>
          )}

          {Object.entries(tracksByDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, tracks]) => (
              <div key={date} className="mb-4 last:mb-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-medium text-gray-500">
                    {formatDate(date, locale)}
                  </h3>
                  {(() => {
                    const day = dayCapacity(date);
                    if (!day) return null;
                    return (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${day.isFull ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                        {t.regSpotsFilled(day.registered, day.max)}
                        {!day.isFull && ` · ${t.regSpotsLeft(day.left)}`}
                      </span>
                    );
                  })()}
                </div>
                {dayCapacity(date)?.isFull && (
                  <p className="text-sm text-red-600 mb-2">{t.regDayFull}</p>
                )}
                <div className="space-y-1">
                  {tracks.map((track) => (
                    <label
                      key={track.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        blockedTrackIds.has(track.id)
                          ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                          : selectedTrackIds.includes(track.id)
                            ? "border-blue-500 bg-blue-50 cursor-pointer"
                            : "border-gray-200 hover:bg-gray-50 cursor-pointer"
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={blockedTrackIds.has(track.id)}
                        checked={selectedTrackIds.includes(track.id) && !blockedTrackIds.has(track.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTrackIds([...selectedTrackIds, track.id]);
                          } else {
                            setSelectedTrackIds(
                              selectedTrackIds.filter((tid) => tid !== track.id)
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
                          {track.officiality}
                        </span>
                        {track.isRelay && (
                          <span className="text-xs text-orange-600">{t.relay}</span>
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
              {t.regRemarks}
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t.regRemarksPlaceholder}
            />
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
            >
              {t.back}
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={enterableTrackIds.length === 0}
              className="px-6 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {t.next}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {step === 3 && selectedDog && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t.regSummary}
          </h2>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-2">{t.regCompetition}</h3>
              <p className="font-medium text-gray-900">{booking.organizerName}</p>
              <p className="text-sm text-gray-600">
                {formatDate(booking.startDate, locale)}
                {booking.startDate !== booking.endDate && ` – ${formatDate(booking.endDate, locale)}`}
                {" · "}{booking.location}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-2">{t.regDog}</h3>
              <p className="font-medium text-gray-900">{selectedDog.nickName}</p>
              <p className="text-sm text-gray-600">
                {[selectedDog.sizeEst && `${t.regSize}: ${selectedDog.sizeEst}`,
                  selectedDog.agilityClass && `Agility: ${selectedDog.agilityClass}`,
                  selectedDog.jumpClass && `Jumping: ${selectedDog.jumpClass}`
                ].filter(Boolean).join(" · ")}
              </p>
              <p className="text-sm text-gray-600">{t.regStandard}: {sizeStandard}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-2">{t.regSelectedTracks}</h3>
              <div className="space-y-1">
                {selectedTrackIds.map((trackId) => {
                  const track = booking.competitionTracks.find((tr) => tr.id === trackId);
                  if (!track) return null;
                  return (
                    <p key={trackId} className="text-sm text-gray-700">
                      {t.regTrack(formatDate(track.competitionDate, locale), track.letter, track.trackType, track.size, track.officiality)}
                    </p>
                  );
                })}
              </div>
            </div>

            {(needsMeasurement || needsCompetitionBook) && (
              <div className="p-4 bg-yellow-50 rounded-lg">
                {needsMeasurement && <p className="text-sm text-yellow-800">{t.regNeedsMeasurement}</p>}
                {needsCompetitionBook && <p className="text-sm text-yellow-800">{t.regNeedsBook}</p>}
              </div>
            )}

            {remarks && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 mb-1">{t.dogsNotes}</h3>
                <p className="text-sm text-gray-700">{remarks}</p>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
            >
              {t.back}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? t.regSubmitting : t.regConfirm}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
