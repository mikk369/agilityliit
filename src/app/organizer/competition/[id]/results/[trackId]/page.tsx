"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface TrackData {
  id: number;
  competitionDate: string;
  letter: string;
  trackType: string;
  size: string;
  competitionType: string;
  referee: string | null;
  booking: { id: number; organizerName: string; clubName: string };
}

interface Parameter {
  id: number;
  sizeGroup: string;
  trackLength: number | null;
  trackSpeed: number | null;
  idealTime: number | null;
  maxTime: number | null;
}

interface CompetitorResult {
  id: number;
  timeSeconds: number | null;
  faults: number;
  isDsq: boolean;
  isDns: boolean;
  hasQualification: boolean;
  notes: string | null;
}

interface Competitor {
  startProtocolId: number | null;
  competitorId: number;
  startNumber: number;
  sortOrder: number;
  size: string;
  handler: { id: number; handlerName: string; clubName: string | null };
  dog: { id: number; nickName: string; sizeEst: string | null; agilityClass: string | null; jumpClass: string | null; breed: string | null };
  result: CompetitorResult | null;
}

interface TrackResponse {
  track: TrackData;
  parameters: Parameter[];
  competitors: Competitor[];
  unlistedCompetitors: Competitor[];
}

interface LocalResult {
  timeSeconds: string;
  faults: string;
  isDsq: boolean;
  isDns: boolean;
  hasQualification: boolean;
}

interface SaveStatus {
  [competitorId: number]: "saving" | "saved" | "error";
}

interface ParameterForm {
  sizeGroup: string;
  trackLength: string;
  trackSpeed: string;
  idealTime: string;
  maxTime: string;
}

export default function TrackResultEntryPage({ params }: { params: Promise<{ id: string; trackId: string }> }) {
  const { id, trackId } = use(params);
  const [data, setData] = useState<TrackResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Parameter forms
  const [paramForms, setParamForms] = useState<ParameterForm[]>([]);
  const [savingParams, setSavingParams] = useState(false);

  // Local result state for inline editing
  const [localResults, setLocalResults] = useState<Record<number, LocalResult>>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({});

  // Debounce timers
  const saveTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    fetchTrackData();
    return () => {
      // Cleanup timers on unmount
      Object.values(saveTimers.current).forEach(clearTimeout);
    };
  }, [trackId]);

  async function fetchTrackData() {
    try {
      const res = await fetch(`/api/results/track/${trackId}`);
      if (res.ok) {
        const trackData: TrackResponse = await res.json();
        setData(trackData);
        initializeLocalResults(trackData);
        initializeParamForms(trackData);
      } else {
        setError("Raja andmete laadimine ebaõnnestus");
      }
    } catch {
      setError("Andmete laadimine ebaõnnestus");
    } finally {
      setLoading(false);
    }
  }

  function initializeLocalResults(trackData: TrackResponse) {
    const results: Record<number, LocalResult> = {};
    const allCompetitors = [...trackData.competitors, ...trackData.unlistedCompetitors];
    for (const comp of allCompetitors) {
      results[comp.competitorId] = {
        timeSeconds: comp.result?.timeSeconds?.toString() ?? "",
        faults: comp.result?.faults?.toString() ?? "0",
        isDsq: comp.result?.isDsq ?? false,
        isDns: comp.result?.isDns ?? false,
        hasQualification: comp.result?.hasQualification ?? false,
      };
    }
    setLocalResults(results);
  }

  function initializeParamForms(trackData: TrackResponse) {
    // Detect size groups from competitors
    const sizeGroups = new Set<string>();
    const allCompetitors = [...trackData.competitors, ...trackData.unlistedCompetitors];
    allCompetitors.forEach((c) => sizeGroups.add(c.size));

    // If parameters already exist, use them
    if (trackData.parameters.length > 0) {
      setParamForms(
        trackData.parameters.map((p) => ({
          sizeGroup: p.sizeGroup,
          trackLength: p.trackLength?.toString() ?? "",
          trackSpeed: p.trackSpeed?.toString() ?? "",
          idealTime: p.idealTime?.toString() ?? "",
          maxTime: p.maxTime?.toString() ?? "",
        }))
      );
    } else {
      // Create empty forms for each detected size group
      const groups = Array.from(sizeGroups).sort();
      if (groups.length === 0) groups.push(trackData.track.size);
      setParamForms(
        groups.map((sg) => ({
          sizeGroup: sg,
          trackLength: "",
          trackSpeed: "",
          idealTime: "",
          maxTime: "",
        }))
      );
    }
  }

  function updateParamForm(index: number, field: keyof ParameterForm, value: string) {
    setParamForms((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  async function handleSaveParameters() {
    setSavingParams(true);
    setMessage(null);
    try {
      const payload = paramForms.map((pf) => ({
        sizeGroup: pf.sizeGroup,
        trackLength: pf.trackLength ? parseFloat(pf.trackLength) : null,
        trackSpeed: pf.trackSpeed ? parseFloat(pf.trackSpeed) : null,
        idealTime: pf.idealTime ? parseFloat(pf.idealTime) : null,
        maxTime: pf.maxTime ? parseFloat(pf.maxTime) : null,
      }));
      const res = await fetch(`/api/results/parameters/${trackId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parameters: payload }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Parameetrid salvestatud!" });
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Parameetrite salvestamine ebaõnnestus" });
      }
    } catch {
      setMessage({ type: "error", text: "Serveri viga" });
    } finally {
      setSavingParams(false);
    }
  }

  function updateLocalResult(competitorId: number, field: keyof LocalResult, value: string | boolean) {
    setLocalResults((prev) => ({
      ...prev,
      [competitorId]: { ...prev[competitorId], [field]: value },
    }));

    // For checkbox changes, save immediately
    if (typeof value === "boolean") {
      // Need to build the result with the updated value
      const current = localResults[competitorId];
      if (!current) return;
      const updated = { ...current, [field]: value };
      debouncedSave(competitorId, updated);
    }
  }

  const debouncedSave = useCallback(
    (competitorId: number, result: LocalResult) => {
      // Clear existing timer
      if (saveTimers.current[competitorId]) {
        clearTimeout(saveTimers.current[competitorId]);
      }
      saveTimers.current[competitorId] = setTimeout(() => {
        saveResult(competitorId, result);
      }, 300);
    },
    [trackId]
  );

  function handleBlur(competitorId: number) {
    const result = localResults[competitorId];
    if (!result) return;
    // Clear any pending debounce
    if (saveTimers.current[competitorId]) {
      clearTimeout(saveTimers.current[competitorId]);
    }
    saveResult(competitorId, result);
  }

  async function saveResult(competitorId: number, result: LocalResult) {
    setSaveStatus((prev) => ({ ...prev, [competitorId]: "saving" }));
    try {
      const res = await fetch("/api/results/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitorId,
          competitionTrackId: parseInt(trackId),
          timeSeconds: result.timeSeconds ? parseFloat(result.timeSeconds) : null,
          faults: parseInt(result.faults) || 0,
          isDsq: result.isDsq,
          isDns: result.isDns,
          hasQualification: result.hasQualification,
        }),
      });
      if (res.ok) {
        setSaveStatus((prev) => ({ ...prev, [competitorId]: "saved" }));
        // Clear saved indicator after 3 seconds
        setTimeout(() => {
          setSaveStatus((prev) => {
            const next = { ...prev };
            if (next[competitorId] === "saved") delete next[competitorId];
            return next;
          });
        }, 3000);
      } else {
        setSaveStatus((prev) => ({ ...prev, [competitorId]: "error" }));
      }
    } catch {
      setSaveStatus((prev) => ({ ...prev, [competitorId]: "error" }));
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-48 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <p className="text-gray-500">{error || "Raja andmeid ei leitud."}</p>
      </div>
    );
  }

  const { track, competitors, unlistedCompetitors } = data;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Link href={`/organizer/competition/${id}/results`} className="text-blue-600 hover:text-blue-700 text-sm">
          &larr; Tagasi tulemuste juurde
        </Link>
      </div>
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-2xl font-bold text-gray-900">
          Rada {track.letter} – {track.trackType}
        </h1>
        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">{track.size}</span>
        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">{track.competitionType}</span>
      </div>
      <p className="text-sm text-gray-600 mb-1">{track.booking.organizerName}</p>
      <p className="text-sm text-gray-500 mb-6">
        {formatDate(track.competitionDate)}
        {track.referee && ` · Kohtunik: ${track.referee}`}
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

      {/* Track Parameters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Raja parameetrid</h2>
        {paramForms.length === 0 ? (
          <p className="text-sm text-gray-500">Võistlejaid pole, parameetreid ei saa määrata.</p>
        ) : (
          <div className="space-y-4">
            {paramForms.map((pf, idx) => (
              <div key={pf.sizeGroup} className="border border-gray-100 rounded-lg p-4">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Suurusgrupp</label>
                    <input
                      type="text"
                      value={pf.sizeGroup}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Raja pikkus (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={pf.trackLength}
                      onChange={(e) => updateParamForm(idx, "trackLength", e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Kiirus (m/s)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={pf.trackSpeed}
                      onChange={(e) => updateParamForm(idx, "trackSpeed", e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Normatiiv (s)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={pf.idealTime}
                      onChange={(e) => updateParamForm(idx, "idealTime", e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Max aeg (s)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={pf.maxTime}
                      onChange={(e) => updateParamForm(idx, "maxTime", e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={handleSaveParameters}
              disabled={savingParams}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {savingParams ? "Salvestamine..." : "Salvesta parameetrid"}
            </button>
          </div>
        )}
      </div>

      {/* Competitor Results Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Võistlejate tulemused ({competitors.length})
          </h2>
        </div>
        {competitors.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Võistlejaid ei ole selle raja jaoks.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="px-3 py-3 font-medium text-gray-600 w-12">Nr</th>
                  <th className="px-3 py-3 font-medium text-gray-600">Koerajuht</th>
                  <th className="px-3 py-3 font-medium text-gray-600">Koer</th>
                  <th className="px-3 py-3 font-medium text-gray-600 w-16">Suurus</th>
                  <th className="px-3 py-3 font-medium text-gray-600 w-16">Klass</th>
                  <th className="px-3 py-3 font-medium text-gray-600 w-24">Aeg (s)</th>
                  <th className="px-3 py-3 font-medium text-gray-600 w-20">Vead</th>
                  <th className="px-3 py-3 font-medium text-gray-600 w-14">DSQ</th>
                  <th className="px-3 py-3 font-medium text-gray-600 w-14">DNS</th>
                  <th className="px-3 py-3 font-medium text-gray-600 w-14">Kval</th>
                  <th className="px-3 py-3 font-medium text-gray-600 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {competitors
                  .sort((a, b) => a.sortOrder - b.sortOrder || a.startNumber - b.startNumber)
                  .map((comp) => (
                    <CompetitorRow
                      key={comp.competitorId}
                      comp={comp}
                      localResult={localResults[comp.competitorId]}
                      status={saveStatus[comp.competitorId]}
                      onUpdate={updateLocalResult}
                      onBlur={handleBlur}
                    />
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Unlisted Competitors */}
      {unlistedCompetitors.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-yellow-50 px-4 py-3 border-b border-yellow-200">
            <h2 className="text-lg font-semibold text-yellow-800">
              Lisavõistlejad ({unlistedCompetitors.length})
            </h2>
            <p className="text-xs text-yellow-600 mt-0.5">Stardiprotokollis puuduvad võistlejad</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="px-3 py-3 font-medium text-gray-600 w-12">Nr</th>
                  <th className="px-3 py-3 font-medium text-gray-600">Koerajuht</th>
                  <th className="px-3 py-3 font-medium text-gray-600">Koer</th>
                  <th className="px-3 py-3 font-medium text-gray-600 w-16">Suurus</th>
                  <th className="px-3 py-3 font-medium text-gray-600 w-16">Klass</th>
                  <th className="px-3 py-3 font-medium text-gray-600 w-24">Aeg (s)</th>
                  <th className="px-3 py-3 font-medium text-gray-600 w-20">Vead</th>
                  <th className="px-3 py-3 font-medium text-gray-600 w-14">DSQ</th>
                  <th className="px-3 py-3 font-medium text-gray-600 w-14">DNS</th>
                  <th className="px-3 py-3 font-medium text-gray-600 w-14">Kval</th>
                  <th className="px-3 py-3 font-medium text-gray-600 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {unlistedCompetitors
                  .sort((a, b) => a.sortOrder - b.sortOrder || a.startNumber - b.startNumber)
                  .map((comp) => (
                    <CompetitorRow
                      key={comp.competitorId}
                      comp={comp}
                      localResult={localResults[comp.competitorId]}
                      status={saveStatus[comp.competitorId]}
                      onUpdate={updateLocalResult}
                      onBlur={handleBlur}
                    />
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function CompetitorRow({
  comp,
  localResult,
  status,
  onUpdate,
  onBlur,
}: {
  comp: Competitor;
  localResult: LocalResult | undefined;
  status: "saving" | "saved" | "error" | undefined;
  onUpdate: (competitorId: number, field: keyof LocalResult, value: string | boolean) => void;
  onBlur: (competitorId: number) => void;
}) {
  if (!localResult) return null;

  const competitorId = comp.competitorId;

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50">
      <td className="px-3 py-2 text-gray-500 font-medium">{comp.startNumber}</td>
      <td className="px-3 py-2">
        <div className="font-medium text-gray-900">{comp.handler.handlerName}</div>
        {comp.handler.clubName && (
          <div className="text-xs text-gray-500">{comp.handler.clubName}</div>
        )}
      </td>
      <td className="px-3 py-2">
        <div className="font-medium text-gray-900">{comp.dog.nickName}</div>
        {comp.dog.breed && (
          <div className="text-xs text-gray-500">{comp.dog.breed}</div>
        )}
      </td>
      <td className="px-3 py-2">
        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
          {comp.dog.sizeEst || comp.size}
        </span>
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          {comp.dog.agilityClass && (
            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
              {comp.dog.agilityClass}
            </span>
          )}
          {comp.dog.jumpClass && (
            <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">
              {comp.dog.jumpClass}
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          step="0.01"
          value={localResult.timeSeconds}
          onChange={(e) => onUpdate(competitorId, "timeSeconds", e.target.value)}
          onBlur={() => onBlur(competitorId)}
          disabled={localResult.isDsq || localResult.isDns}
          placeholder="0.00"
          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          min="0"
          value={localResult.faults}
          onChange={(e) => onUpdate(competitorId, "faults", e.target.value)}
          onBlur={() => onBlur(competitorId)}
          disabled={localResult.isDsq || localResult.isDns}
          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
        />
      </td>
      <td className="px-3 py-2 text-center">
        <input
          type="checkbox"
          checked={localResult.isDsq}
          onChange={(e) => onUpdate(competitorId, "isDsq", e.target.checked)}
          className="rounded text-red-600 focus:ring-red-500"
        />
      </td>
      <td className="px-3 py-2 text-center">
        <input
          type="checkbox"
          checked={localResult.isDns}
          onChange={(e) => onUpdate(competitorId, "isDns", e.target.checked)}
          className="rounded text-yellow-600 focus:ring-yellow-500"
        />
      </td>
      <td className="px-3 py-2 text-center">
        <input
          type="checkbox"
          checked={localResult.hasQualification}
          onChange={(e) => onUpdate(competitorId, "hasQualification", e.target.checked)}
          disabled={localResult.isDsq || localResult.isDns}
          className="rounded text-green-600 focus:ring-green-500 disabled:opacity-50"
        />
      </td>
      <td className="px-3 py-2">
        <SaveIndicator status={status} />
      </td>
    </tr>
  );
}

function SaveIndicator({ status }: { status: "saving" | "saved" | "error" | undefined }) {
  if (!status) return null;

  if (status === "saving") {
    return (
      <div className="flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "saved") {
    return (
      <div className="flex items-center justify-center">
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center justify-center" title="Salvestamine ebaõnnestus">
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    );
  }

  return null;
}

