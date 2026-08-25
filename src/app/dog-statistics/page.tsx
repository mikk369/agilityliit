"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "@/i18n/LanguageContext";
import type { StatResult, SearchResponse, StatFilters, AutocompleteField } from "@/types";

const initialFilters: StatFilters = {
  organizer: "",
  breed: "",
  gender: "",
  dog_name: "",
  register_code: "",
  handler_name: "",
  judge: "",
  date_from: "",
  date_to: "",
};

export default function DogStatisticsPage() {
  const { t } = useTranslation();
  const [filters, setStatFilters] = useState<StatFilters>(initialFilters);
  const [results, setResults] = useState<StatResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [organizers, setOrganizers] = useState<string[]>([]);
  const [breeds, setBreeds] = useState<string[]>([]);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeField, setActiveField] = useState<AutocompleteField | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Load dropdown options on mount
  useEffect(() => {
    fetch("/api/dog-statistics/options")
      .then((res) => res.json())
      .then((data) => {
        setOrganizers(data.organizers || []);
        setBreeds(data.breeds || []);
      })
      .catch(() => {});
  }, []);

  // Click outside to close suggestions
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (activeField && wrapperRefs.current[activeField]) {
        if (!wrapperRefs.current[activeField]!.contains(e.target as Node)) {
          setSuggestions([]);
          setActiveField(null);
        }
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [activeField]);

  const fetchSuggestions = useCallback((field: AutocompleteField, query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 1) {
      setSuggestions([]);
      setActiveField(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/dog-statistics/autocomplete?field=${field}&q=${encodeURIComponent(query)}`
        );
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
        setActiveField(field);
      } catch {
        setSuggestions([]);
      }
    }, 250);
  }, []);

  const fetchResults = useCallback(
    async (p: number, pp: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.organizer) params.set("organizer", filters.organizer);
        if (filters.breed) params.set("breed", filters.breed);
        if (filters.gender) params.set("gender", filters.gender);
        if (filters.dog_name) params.set("dog_name", filters.dog_name);
        if (filters.register_code) params.set("register_code", filters.register_code);
        if (filters.handler_name) params.set("handler_name", filters.handler_name);
        if (filters.judge) params.set("judge", filters.judge);
        if (filters.date_from) params.set("date_from", filters.date_from);
        if (filters.date_to) params.set("date_to", filters.date_to);
        params.set("page", String(p));
        params.set("per_page", String(pp));

        const res = await fetch(`/api/dog-statistics?${params.toString()}`);
        const data: SearchResponse = await res.json();
        setResults(data.results || []);
        setTotal(data.total || 0);
        setPage(data.page || 1);
        setPerPage(data.per_page || pp);
        setTotalPages(data.total_pages || 0);
        setSearched(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  const updateFilter = (field: keyof StatFilters, value: string) => {
    setStatFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => fetchResults(1, perPage);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    fetchResults(newPage, perPage);
  };

  const buildPageNumbers = (): (number | "...")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "...")[] = [];
    if (page <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages);
    } else if (page >= totalPages - 3) {
      pages.push(1);
      pages.push("...");
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push("...");
      for (let i = page - 1; i <= page + 1; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const AutocompleteInput = ({
    field,
    label,
  }: {
    field: AutocompleteField;
    label: string;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div
        className="relative"
        ref={(el) => {
          wrapperRefs.current[field] = el;
        }}
      >
        <input
          type="text"
          value={filters[field]}
          onChange={(e) => {
            updateFilter(field, e.target.value);
            fetchSuggestions(field, e.target.value);
          }}
          onFocus={() => {
            if (filters[field].length >= 1) fetchSuggestions(field, filters[field]);
          }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
        {activeField === field && suggestions.length > 0 && (
          <ul className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto">
            {suggestions.map((s) => (
              <li
                key={s}
                onMouseDown={() => {
                  updateFilter(field, s);
                  setSuggestions([]);
                  setActiveField(null);
                }}
                className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700"
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t.statsTitle}</h1>

      {/* Search form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">{t.statsSearch}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Date range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.statsDateFrom}
            </label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => updateFilter("date_from", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.statsDateTo}
            </label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => updateFilter("date_to", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Organizer dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.statsOrganizer}
            </label>
            <select
              value={filters.organizer}
              onChange={(e) => updateFilter("organizer", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="">{t.all}</option>
              {organizers.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          {/* Breed dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.statsBreed}</label>
            <select
              value={filters.breed}
              onChange={(e) => updateFilter("breed", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="">{t.all}</option>
              {breeds.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.statsGender}</label>
            <select
              value={filters.gender}
              onChange={(e) => updateFilter("gender", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="">{t.all}</option>
              <option value="Isane">{t.statsMale}</option>
              <option value="Emane">{t.statsFemale}</option>
            </select>
          </div>

          {/* Autocomplete fields */}
          <AutocompleteInput field="dog_name" label={t.statsDogName} />
          <AutocompleteInput field="register_code" label={t.statsRegCode} />
          <AutocompleteInput field="handler_name" label={t.statsHandler} />
          <AutocompleteInput field="judge" label={t.statsJudge} />
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors text-sm font-medium"
        >
          {loading ? t.searching : t.search}
        </button>
      </div>

      {/* Results */}
      {searched && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              {t.statsFound(total)}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{t.statsPerPage}</span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    const pp = Number(e.target.value);
                    setPerPage(pp);
                    fetchResults(1, pp);
                  }}
                  className="border border-gray-300 rounded-lg px-2 py-1 text-sm bg-white"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            )}
          </div>

          {/* Pagination top */}
          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              buildPageNumbers={buildPageNumbers}
              onPageChange={handlePageChange}
            />
          )}

          {/* Results table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto" />
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">{t.statsNoResults}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-3 font-medium text-gray-600">{t.statsColDate}</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-600">{t.statsColTrackType}</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-600">{t.statsColCompType}</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-600">{t.statsColOrganizer}</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-600">{t.statsColJudge}</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-600">{t.statsColBreed}</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-600">{t.statsColDog}</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-600">{t.statsColHandler}</th>
                      <th className="text-right py-3 px-3 font-medium text-gray-600">{t.statsColPoints}</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-600">{t.statsColGrade}</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-600">{t.statsColResult}</th>
                      <th className="text-right py-3 px-3 font-medium text-gray-600">{t.statsColPlace}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-gray-50 hover:bg-gray-50"
                      >
                        <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap">
                          {r.competition_date}
                        </td>
                        <td className="py-2.5 px-3 font-medium">{r.track_type}</td>
                        <td className="py-2.5 px-3">{r.competition_type}</td>
                        <td className="py-2.5 px-3">{r.organizer}</td>
                        <td className="py-2.5 px-3">{r.judge}</td>
                        <td className="py-2.5 px-3 text-gray-600">{r.breed}</td>
                        <td className="py-2.5 px-3 font-medium">{r.dog_name}</td>
                        <td className="py-2.5 px-3">{r.handler_name}</td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {r.points !== null ? r.points : ""}
                        </td>
                        <td className="py-2.5 px-3">
                          {r.grade && (
                            <span
                              className={`text-xs font-medium ${
                                r.grade === "diskval."
                                  ? "text-red-600"
                                  : "text-orange-600"
                              }`}
                            >
                              {r.grade}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {r.result && (
                            <span className="text-green-600 font-medium">{r.result}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold">
                          {r.place ?? ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination bottom */}
          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              buildPageNumbers={buildPageNumbers}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  buildPageNumbers,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  buildPageNumbers: () => (number | "...")[];
  onPageChange: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1 mb-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        &laquo;
      </button>
      {buildPageNumbers().map((p, i) =>
        p === "..." ? (
          <span key={`e${i}`} className="px-2 text-gray-400">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`px-3 py-1.5 text-sm rounded-lg border ${
              p === page
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-300 hover:bg-gray-100"
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        &raquo;
      </button>
    </div>
  );
}
