"use client";

import type { CompetitionTrack } from "@/types";
import { formatDate } from "@/lib/utils";

export function TrackTable({
  tracks,
  onDelete,
}: {
  tracks: CompetitionTrack[];
  onDelete: (trackId: number) => void;
}) {
  const tracksByDate: Record<string, CompetitionTrack[]> = {};
  tracks.forEach((t) => {
    const date = t.competitionDate.split("T")[0];
    if (!tracksByDate[date]) tracksByDate[date] = [];
    tracksByDate[date].push(t);
  });

  if (Object.keys(tracksByDate).length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-500">Radu pole veel lisatud.</p>
      </div>
    );
  }

  return (
    <>
      {Object.entries(tracksByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, dayTracks]) => (
          <div key={date} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700">{formatDate(date)}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-4 py-2 font-medium text-gray-600">Täht</th>
                    <th className="px-4 py-2 font-medium text-gray-600">Võistlusklass</th>
                    <th className="px-4 py-2 font-medium text-gray-600">Suurusrühm</th>
                    <th className="px-4 py-2 font-medium text-gray-600">Võistlustüüp</th>
                    <th className="px-4 py-2 font-medium text-gray-600">Kohtunik</th>
                    <th className="px-4 py-2 font-medium text-gray-600">Standard</th>
                    <th className="px-4 py-2 font-medium text-gray-600"></th>
                  </tr>
                </thead>
                <tbody>
                  {dayTracks.map((track) => (
                    <tr key={track.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2 font-semibold">{track.letter}</td>
                      <td className="px-4 py-2">{track.trackType}</td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">{track.size}</span>
                      </td>
                      <td className="px-4 py-2">{track.officiality}</td>
                      <td className="px-4 py-2">{track.referee || "—"}</td>
                      <td className="px-4 py-2">{track.sizeStandard || "—"}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          {track.isRelay && (
                            <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">Teaterada</span>
                          )}
                          <button
                            onClick={() => onDelete(track.id)}
                            className="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs transition-colors"
                          >
                            Kustuta
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
    </>
  );
}
