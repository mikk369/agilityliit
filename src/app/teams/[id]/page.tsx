"use client";

import { useState, useEffect, use } from "react";

interface TeamMember {
  competitorId: number;
  sortOrder: number;
  competitor: {
    handler: { handlerName: string; clubName: string | null };
    dog: { nickName: string; sizeEst: string | null; breed: string | null };
  };
}

interface Team {
  id: number;
  competitionDate: string;
  size: string;
  trackType: string | null;
  teamName: string;
  sortOrder: number;
  members: TeamMember[];
  results: {
    competitionTrackId: number;
    timeSeconds: number | null;
    faults: number;
    isDsq: boolean;
    isDns: boolean;
  }[];
}

interface Booking {
  organizerName: string;
  startDate: string;
  endDate: string;
  location: string;
}

export default function PublicTeamsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/teams/public/${id}`);
        if (res.status === 403) {
          setError("Võistkonnad pole veel avaldatud.");
          return;
        }
        if (!res.ok) {
          setError("Andmete laadimine ebaõnnestus.");
          return;
        }
        const data = await res.json();
        setBooking(data.booking);
        setTeams(data.teams || []);
      } catch {
        setError("Serveri viga.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  // Group teams by date + size
  const groups: Record<string, Team[]> = {};
  teams.forEach((t) => {
    const key = `${t.competitionDate.split("T")[0]}|${t.size}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Võistkonnad
      </h1>
      {booking && (
        <p className="text-sm text-gray-600 mb-6">
          {booking.organizerName} · {formatDate(booking.startDate)}
          {booking.startDate !== booking.endDate && ` – ${formatDate(booking.endDate)}`}
          {" · "}{booking.location}
        </p>
      )}

      {teams.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">Võistkondi pole veel lisatud.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groups)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, groupTeams]) => {
              const [date, size] = key.split("|");
              return (
                <div key={key}>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">
                    {formatDate(date)} · {size}
                  </h2>
                  <div className="space-y-3">
                    {groupTeams
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((team, idx) => (
                        <div
                          key={team.id}
                          className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                        >
                          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-700">
                              {idx + 1}. {team.teamName || `Võistkond ${idx + 1}`}
                            </span>
                            {team.trackType && (
                              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                {team.trackType}
                              </span>
                            )}
                          </div>
                          <div className="p-4">
                            <div className="space-y-1">
                              {team.members
                                .sort((a, b) => a.sortOrder - b.sortOrder)
                                .map((m, mIdx) => (
                                  <div
                                    key={m.competitorId}
                                    className="flex items-center gap-3 text-sm"
                                  >
                                    <span className="text-gray-400 w-5 text-right">
                                      {mIdx + 1}.
                                    </span>
                                    <span className="font-medium text-gray-900">
                                      {m.competitor.handler.handlerName}
                                    </span>
                                    <span className="text-gray-500">
                                      {m.competitor.dog.nickName}
                                    </span>
                                    {m.competitor.dog.breed && (
                                      <span className="text-gray-400 text-xs">
                                        ({m.competitor.dog.breed})
                                      </span>
                                    )}
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("et-EE");
}
