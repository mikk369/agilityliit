"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "@/i18n/LanguageContext";
import { formatDate } from "@/lib/utils";
import type { DogResult } from "@/types";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

export default function ResultsPage() {
  const { t, locale } = useTranslation();
  const [results, setResults] = useState<DogResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/results/my");
        if (res.ok) {
          setResults(await res.json());
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <LoadingSkeleton />;

  // Group results by dog
  const byDog: Record<string, DogResult[]> = {};
  results.forEach((r) => {
    if (!byDog[r.dogNickName]) byDog[r.dogNickName] = [];
    byDog[r.dogNickName].push(r);
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t.myResultsTitle}</h1>

      {results.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">
            {t.myResultsEmpty}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byDog).map(([dogName, dogResults]) => (
            <div key={dogName} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-900">{dogName}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/50">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">{t.myResultsCompetition}</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">{t.myResultsDate}</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">{t.myResultsTrack}</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">{t.myResultsTime}</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">{t.myResultsFaults}</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">{t.myResultsClean}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dogResults.map((r) => (
                      <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <Link
                            href={`/results/${r.bookingId}`}
                            className="text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            {r.bookingName}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {formatDate(r.competitionDate, locale)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium">{r.trackLetter}</span>
                          <span className="text-gray-500 ml-1">
                            ({r.trackType}, {r.officiality})
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {r.isDsq ? (
                            <span className="text-red-600 font-medium">DSQ</span>
                          ) : r.isDns ? (
                            <span className="text-orange-600 font-medium">DNS</span>
                          ) : r.timeSeconds ? (
                            <span className="font-medium">{r.timeSeconds.toFixed(2)}s</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {r.isDsq || r.isDns ? (
                            <span className="text-gray-400">—</span>
                          ) : r.faults > 0 ? (
                            <span className="text-red-600">{r.faults}</span>
                          ) : (
                            <span className="text-green-600">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {r.hasQualification ? (
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
