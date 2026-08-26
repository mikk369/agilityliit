"use client";

import type { CompetitorEntry } from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function CompetitorTable({
  competitors,
  totalCount,
  onStatusChange,
  onDelete,
}: {
  competitors: CompetitorEntry[];
  totalCount: number;
  onStatusChange: (competitorId: number, newStatus: string) => void;
  onDelete: (competitorId: number, name: string) => void;
}) {
  return (
    <>
      {competitors.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">
            {totalCount === 0
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
                {competitors.map((comp, idx) => (
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
                            onClick={() => onStatusChange(comp.id, "ACCEPTED")}
                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                          >
                            Kinnita
                          </button>
                        ) : (
                          <button
                            onClick={() => onStatusChange(comp.id, "PENDING")}
                            className="px-2 py-1 text-xs text-yellow-700 hover:bg-yellow-50 rounded transition-colors"
                          >
                            Ootele
                          </button>
                        )}
                        <button
                          onClick={() => onDelete(comp.id, comp.handler.handlerName)}
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
    </>
  );
}
