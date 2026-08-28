"use client";

import { sortResults } from "@/lib/utils";
import type { TrackData } from "./types";

export function TrackResultCard({ data }: { data: TrackData }) {
  const { track, parameters, competitors } = data;

  // Sort: DNS/DSQ last, then by time ascending
  const sorted = sortResults(competitors);

  // Calculate place numbers
  let place = 0;
  const places: (number | null)[] = sorted.map((comp) => {
    if (comp.isDns || comp.isDsq) return null;
    place++;
    return place;
  });

  // Find the ideal time for highlighting clean runs
  const idealTimeForSize =
    parameters.length > 0 ? parameters[0].idealTime : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Track header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg font-bold text-gray-900">
            {track.letter}
          </span>
          <span className="text-sm font-medium text-gray-700">
            {track.trackType}
          </span>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
            {track.size}
          </span>
          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
            {track.officiality}
          </span>
          {track.isRelay && (
            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">
              Teateviis
            </span>
          )}
          {track.referee && (
            <span className="text-xs text-gray-500 ml-auto">
              Kohtunik: {track.referee}
            </span>
          )}
        </div>
      </div>

      {/* Track parameters */}
      {parameters.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
          <div className="overflow-x-auto">
            <table className="text-xs text-gray-600">
              <thead>
                <tr>
                  <th className="pr-4 py-1 font-medium text-left">Grupp</th>
                  <th className="pr-4 py-1 font-medium text-right">
                    Pikkus (m)
                  </th>
                  <th className="pr-4 py-1 font-medium text-right">
                    Kiirus (m/s)
                  </th>
                  <th className="pr-4 py-1 font-medium text-right">
                    Normiaeg (s)
                  </th>
                  <th className="py-1 font-medium text-right">Maksimaeg (s)</th>
                </tr>
              </thead>
              <tbody>
                {parameters.map((p) => (
                  <tr key={p.sizeGroup}>
                    <td className="pr-4 py-0.5 font-medium">{p.sizeGroup}</td>
                    <td className="pr-4 py-0.5 text-right">
                      {p.trackLength ?? "—"}
                    </td>
                    <td className="pr-4 py-0.5 text-right">
                      {p.trackSpeed ?? "—"}
                    </td>
                    <td className="pr-4 py-0.5 text-right">
                      {p.idealTime ?? "—"}
                    </td>
                    <td className="py-0.5 text-right">{p.maxTime ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results table */}
      {sorted.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-gray-500">Tulemusi pole veel sisestatud.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="px-4 py-2.5 font-medium text-gray-600 w-14">
                  Koht
                </th>
                <th className="px-4 py-2.5 font-medium text-gray-600">
                  Koerajuht
                </th>
                <th className="px-4 py-2.5 font-medium text-gray-600">Koer</th>
                <th className="px-4 py-2.5 font-medium text-gray-600 w-20">
                  Suurus
                </th>
                <th className="px-4 py-2.5 font-medium text-gray-600 w-24">
                  Klass
                </th>
                <th className="px-4 py-2.5 font-medium text-gray-600 w-20 text-right">
                  Aeg
                </th>
                <th className="px-4 py-2.5 font-medium text-gray-600 w-16 text-right">
                  Vead
                </th>
                <th className="px-4 py-2.5 font-medium text-gray-600 w-16 text-center">
                  Puhas
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((comp, idx) => {
                const isCleanRun =
                  !comp.isDsq &&
                  !comp.isDns &&
                  comp.faults === 0 &&
                  idealTimeForSize !== null &&
                  comp.timeSeconds !== null &&
                  comp.timeSeconds <= idealTimeForSize;

                return (
                  <tr
                    key={comp.competitorId}
                    className={`border-b border-gray-50 hover:bg-gray-50 ${
                      isCleanRun ? "bg-green-50/50" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5 font-semibold text-gray-900">
                      {places[idx] !== null ? places[idx] : ""}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-900">
                        {comp.handler.handlerName}
                      </div>
                      {comp.handler.clubName && (
                        <div className="text-xs text-gray-500">
                          {comp.handler.clubName}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-900">
                        {comp.dog.nickName}
                      </div>
                      {comp.dog.breed && (
                        <div className="text-xs text-gray-500">
                          {comp.dog.breed}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {comp.dog.sizeEst && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                          {comp.dog.sizeEst}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
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
                    <td className="px-4 py-2.5 text-right font-mono">
                      {comp.isDsq ? (
                        <span className="text-red-600 font-semibold">DSQ</span>
                      ) : comp.isDns ? (
                        <span className="text-orange-600 font-semibold">
                          DNS
                        </span>
                      ) : comp.timeSeconds !== null ? (
                        <span className="text-gray-900">
                          {comp.timeSeconds.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {!comp.isDsq && !comp.isDns && (
                        <span
                          className={
                            comp.faults > 0 ? "text-red-600" : "text-gray-900"
                          }
                        >
                          {comp.faults}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {comp.hasQualification && (
                        <svg
                          className="w-5 h-5 text-green-600 mx-auto"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
