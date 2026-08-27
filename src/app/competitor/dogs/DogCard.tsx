"use client";

import { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";
import type { Translations } from "@/i18n/translations/et";
import type { Dog, DogMeasurementEntry, DogMeasurementHistory, ProgressionData } from "@/types";

export function DogCard({
  dog,
  locale,
  t,
  onEdit,
  onDelete,
}: {
  dog: Dog;
  locale: string;
  t: Translations;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [progression, setProgression] = useState<ProgressionData | null>(null);
  const [progressionLoading, setProgressionLoading] = useState(false);
  const [progressionLoaded, setProgressionLoaded] = useState(false);
  const [measurements, setMeasurements] = useState<DogMeasurementHistory | null>(null);
  const [measurementsLoading, setMeasurementsLoading] = useState(false);
  const [measurementsLoaded, setMeasurementsLoaded] = useState(false);
  const [measurementsError, setMeasurementsError] = useState(false);

  useEffect(() => {
    if (expanded && !progressionLoaded) {
      setProgressionLoading(true);
      fetch(`/api/results/dog-progression/${dog.id}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setProgression(data);
          setProgressionLoaded(true);
        })
        .catch(() => setProgressionLoaded(true))
        .finally(() => setProgressionLoading(false));
    }
  }, [expanded, progressionLoaded, dog.id]);

  useEffect(() => {
    if (!expanded || measurementsLoaded) return;
    setMeasurementsLoading(true);
    fetch(`/api/dogs/${dog.id}/measurements`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: DogMeasurementHistory) => {
        setMeasurements(data);
        setMeasurementsLoaded(true);
      })
      .catch(() => {
        setMeasurementsError(true);
        setMeasurementsLoaded(true);
      })
      .finally(() => setMeasurementsLoading(false));
  }, [expanded, measurementsLoaded, dog.id]);

  function isExpired(date: string | null) {
    if (!date) return true;
    return new Date(date) < new Date();
  }

  function isSoonExpiring(date: string | null) {
    if (!date) return false;
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);
    return new Date(date) < soon && !isExpired(date);
  }

  function vaccineStatus(date: string | null) {
    if (!date) return { text: t.dogsVaccMissing, className: "text-red-600" };
    if (isExpired(date)) return { text: t.dogsVaccExpired(formatDate(date, locale)), className: "text-red-600" };
    if (isSoonExpiring(date)) return { text: t.dogsVaccExpiringSoon(formatDate(date, locale)), className: "text-yellow-600" };
    return { text: formatDate(date, locale), className: "text-green-600" };
  }

  const generalVacc = vaccineStatus(dog.generalVaccinationEnd);
  const rabiesVacc = vaccineStatus(dog.rabiesVaccinationEnd);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600 shrink-0">
            <svg className={`w-5 h-5 transition-transform ${expanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{dog.nickName}</span>
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
            <p className="text-sm text-gray-500 truncate">
              {[dog.breed, dog.officialName].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onEdit} className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            {t.edit}
          </button>
          <button onClick={onDelete} className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            {t.delete}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <DetailItem label={t.dogsOfficialName} value={dog.officialName} />
            <DetailItem label={t.dogsBreed} value={dog.breed} />
            <DetailItem label={t.dogsGender} value={dog.gender === "M" ? t.dogsMale : dog.gender === "F" ? t.dogsFemale : dog.gender} />
            <DetailItem label={t.dogsBirthday} value={dog.birthday ? formatDate(dog.birthday, locale) : null} />
            <DetailItem label={t.dogsSizeEst} value={dog.sizeEst} />
            <DetailItem label={t.dogsSizeFci} value={dog.sizeFci} />
            <DetailItem label={t.dogsRegisterCode} value={dog.registerCode} />
            <DetailItem label={t.dogsIdCode} value={dog.idCode} />
            <DetailItem label={t.dogsOwner} value={dog.ownersName} />
            <div>
              <span className="text-gray-500">{t.dogsGeneralVaccShort}</span>
              <p className={`font-medium ${generalVacc.className}`}>{generalVacc.text}</p>
            </div>
            <div>
              <span className="text-gray-500">{t.dogsRabiesVaccShort}</span>
              <p className={`font-medium ${rabiesVacc.className}`}>{rabiesVacc.text}</p>
            </div>
          </div>
          {dog.info && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <span className="text-sm text-gray-500">{t.dogsNotes}:</span>
              <p className="text-sm text-gray-700">{dog.info}</p>
            </div>
          )}

          {/* Measurement results */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{t.measurementsTitle}</h3>
            {measurementsLoading ? (
              <div className="animate-pulse h-6 bg-gray-200 rounded w-48" />
            ) : measurementsError ? (
              <p className="text-xs text-red-600">{t.measurementsLoadError}</p>
            ) : (
              <div className="space-y-2">
                {measurements && measurements.measurements.length > 0 ? (
                  groupMeasurementsByCompetition(measurements.measurements).map((group) => (
                    <div key={group.competitionId}>
                      <p className="text-xs font-medium text-gray-600">
                        {group.competitionName}
                        <span className="text-gray-400"> · {formatDate(group.competitionStartDate, locale)}</span>
                      </p>
                      {group.entries.map((m, i) => (
                        <p key={m.id} className="text-xs text-gray-600">
                          {t.measurementLabel(i + 1)}: {t.measurementReferee} {m.referee || "—"},{" "}
                          {m.measurementCm !== null ? `${m.measurementCm} cm` : m.measurementEst || "—"}
                          {m.measurementCm !== null && m.measurementEst ? ` — EKL ${m.measurementEst}` : ""}
                          {m.measurementCm !== null && m.measurementFci ? `, FCI ${m.measurementFci}` : ""}
                        </p>
                      ))}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400">{t.measurementsNone}</p>
                )}
                <p className="text-xs text-gray-600">
                  <span className="font-medium">{t.measurementOfficialClass}: </span>
                  {measurements?.sizeOfficial
                    ? `${measurements.sizeOfficial}${
                        measurements.sizeOfficialFci ? ` (FCI: ${measurements.sizeOfficialFci})` : ""
                      }`
                    : t.measurementOfficialClassPending}
                </p>
              </div>
            )}
          </div>

          {/* Class Progression */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{t.progressionTitle}</h3>
            {progressionLoading ? (
              <div className="animate-pulse h-6 bg-gray-200 rounded w-48" />
            ) : progression ? (
              <div className="space-y-2">
                {/* Agility progression */}
                {progression.currentAgilityClass === "A3" ? (
                  <p className="text-xs text-gray-500">Agility: {t.progressionHighest("A3")}</p>
                ) : progression.agilityNextClass ? (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-600">
                        Agility: {progression.currentAgilityClass} → {progression.agilityNextClass}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({progression.agilityClearCount}/{progression.agilityRequired} {t.progressionClearTracks})
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div
                        className={`h-1.5 rounded-full ${
                          progression.agilityEligible ? "bg-green-500" : "bg-blue-500"
                        }`}
                        style={{
                          width: `${Math.min(100, (progression.agilityClearCount / progression.agilityRequired) * 100)}%`,
                        }}
                      />
                    </div>
                    {progression.agilityEligible && (
                      <p className="text-xs text-green-600 font-medium mt-1">
                        {t.progressionEligible}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Agility: {progression.currentAgilityClass || "—"}</p>
                )}

                {/* Jump progression */}
                {progression.currentJumpClass === "H0" ? (
                  <p className="text-xs text-gray-500">Jumping: {t.progressionJumpH0}</p>
                ) : progression.currentJumpClass === "H3" ? (
                  <p className="text-xs text-gray-500">Jumping: {t.progressionHighest("H3")}</p>
                ) : progression.jumpNextClass ? (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-600">
                        Jumping: {progression.currentJumpClass} → {progression.jumpNextClass}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({progression.jumpClearCount}/{progression.jumpRequired} {t.progressionClearTracks})
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div
                        className={`h-1.5 rounded-full ${
                          progression.jumpEligible ? "bg-green-500" : "bg-orange-500"
                        }`}
                        style={{
                          width: `${Math.min(100, (progression.jumpClearCount / progression.jumpRequired) * 100)}%`,
                        }}
                      />
                    </div>
                    {progression.jumpEligible && (
                      <p className="text-xs text-green-600 font-medium mt-1">
                        {t.progressionEligible}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Jumping: {progression.currentJumpClass || "—"}</p>
                )}

                {/* Senior counts */}
                {(progression.seniorAgilityClearCount > 0 || progression.seniorJumpClearCount > 0) && (
                  <div className="text-xs text-gray-500">
                    {progression.seniorAgilityClearCount > 0 && (
                      <span>{t.progressionSeniorA(progression.seniorAgilityClearCount)} </span>
                    )}
                    {progression.seniorJumpClearCount > 0 && (
                      <span>{t.progressionSeniorH(progression.seniorJumpClearCount)}</span>
                    )}
                  </div>
                )}

                {/* Clean tracks list */}
                {progression.clearTracks.length > 0 && (
                  <details className="mt-1">
                    <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-700">
                      {t.progressionClearTracksList(progression.clearTracks.length)}
                    </summary>
                    <div className="mt-1 space-y-0.5">
                      {progression.clearTracks.map((tr, i) => (
                        <div key={i} className="text-xs text-gray-600 flex gap-2">
                          <span className="text-gray-400">{formatDate(tr.date, locale)}</span>
                          <span>{tr.competitionName}</span>
                          <span className="text-gray-400">{tr.trackName}</span>
                          <span className="font-mono">{tr.timeSeconds.toFixed(2)}s</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400">{t.noData}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type MeasurementGroup = {
  competitionId: number;
  competitionName: string;
  competitionStartDate: string;
  entries: DogMeasurementEntry[];
};

/** Measurements of one competition belong together, in the order they were taken. */
function groupMeasurementsByCompetition(entries: DogMeasurementEntry[]): MeasurementGroup[] {
  const groups: MeasurementGroup[] = [];
  for (const entry of entries) {
    const existing = groups.find((g) => g.competitionId === entry.competitionId);
    if (existing) {
      existing.entries.push(entry);
    } else {
      groups.push({
        competitionId: entry.competitionId,
        competitionName: entry.competitionName,
        competitionStartDate: entry.competitionStartDate,
        entries: [entry],
      });
    }
  }
  return groups;
}

function DetailItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-gray-500">{label}</span>
      <p className="font-medium text-gray-900">{value || "—"}</p>
    </div>
  );
}
