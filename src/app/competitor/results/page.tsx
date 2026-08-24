"use client";

import { useState, useEffect } from "react";

interface DogResult {
  bookingName: string;
  bookingDate: string;
  trackLetter: string;
  trackType: string;
  competitionType: string;
  timeSeconds: number | null;
  faults: number;
  isDsq: boolean;
  isDns: boolean;
  hasQualification: boolean;
  dogNickName: string;
}

export default function ResultsPage() {
  const [results, setResults] = useState<DogResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Results API will be built in Phase 5
        // For now show placeholder
        setResults([]);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Minu tulemused</h1>

      {results.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">
            Tulemusi pole veel. Tulemused ilmuvad siia pärast võistlustel osalemist.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Koer</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Võistlus</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Rada</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Aeg</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Vead</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Kval.</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="py-3 px-4 font-medium">{r.dogNickName}</td>
                  <td className="py-3 px-4">
                    <p>{r.bookingName}</p>
                    <p className="text-xs text-gray-500">{formatDate(r.bookingDate)}</p>
                  </td>
                  <td className="py-3 px-4">
                    {r.trackLetter} ({r.trackType}, {r.competitionType})
                  </td>
                  <td className="py-3 px-4">
                    {r.isDsq ? "DSQ" : r.isDns ? "DNS" : r.timeSeconds ? `${r.timeSeconds}s` : "—"}
                  </td>
                  <td className="py-3 px-4">{r.faults}</td>
                  <td className="py-3 px-4">
                    {r.hasQualification ? (
                      <span className="text-green-600 font-medium">Jah</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("et-EE");
}
