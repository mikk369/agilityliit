"use client";

import { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import type { Team, TeamMember, TeamsResponse } from "@/types";
import { MessageBanner } from "@/components/ui/MessageBanner";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

interface TeamsPageCompetitor {
  id: number;
  status: string;
  handler: { id: number; handlerName: string; clubName: string | null };
  dog: { id: number; nickName: string; sizeEst: string | null; sizeFci: string | null };
  competitorTracks: {
    competitionTrack: {
      id: number;
      competitionDate: string;
      size: string;
      trackType: string;
      isRelay: boolean;
    };
  }[];
}

type GroupKey = string; // "date|size"

function makeGroupKey(date: string, size: string): GroupKey {
  return `${date}|${size}`;
}

function parseGroupKey(key: GroupKey): { date: string; size: string } {
  const [date, size] = key.split("|");
  return { date, size };
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("et-EE", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function TeamsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [bookingName, setBookingName] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [competitors, setCompetitors] = useState<TeamsPageCompetitor[]>([]);
  const [locked, setLocked] = useState(false);
  const [published, setPublished] = useState(false);
  const [activeGroup, setActiveGroup] = useState<GroupKey | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [bookingRes, teamsRes, compRes] = await Promise.all([
        fetch(`/api/bookings/${id}`),
        fetch(`/api/teams/${id}`),
        fetch(`/api/competitors/booking/${id}`),
      ]);

      if (bookingRes.ok) {
        const b = await bookingRes.json();
        setBookingName(b.organizerName);
      }

      if (teamsRes.ok) {
        const data: TeamsResponse = await teamsRes.json();
        setTeams(data.teams || []);
        setLocked(data.teamsLocked === 1);
        setPublished(data.teamsPublished === 1);
      } else {
        setTeams([]);
        setLocked(false);
        setPublished(false);
      }

      if (compRes.ok) {
        const allComp: TeamsPageCompetitor[] = await compRes.json();
        setCompetitors(allComp.filter((c) => c.status === "ACCEPTED"));
      }
    } catch {
      setMessage({ type: "error", text: "Andmete laadimine ebaonnestus" });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build groups from competitors who have relay tracks
  const groups: Map<GroupKey, { date: string; size: string; trackType: string }> = new Map();
  competitors.forEach((comp) => {
    comp.competitorTracks.forEach((ct) => {
      if (ct.competitionTrack.isRelay) {
        const key = makeGroupKey(ct.competitionTrack.competitionDate, ct.competitionTrack.size);
        if (!groups.has(key)) {
          groups.set(key, {
            date: ct.competitionTrack.competitionDate,
            size: ct.competitionTrack.size,
            trackType: ct.competitionTrack.trackType,
          });
        }
      }
    });
  });

  // Also add groups from existing teams
  teams.forEach((team) => {
    const key = makeGroupKey(team.competitionDate, team.size);
    if (!groups.has(key)) {
      groups.set(key, {
        date: team.competitionDate,
        size: team.size,
        trackType: team.trackType || "RELAY",
      });
    }
  });

  const sortedGroupKeys = Array.from(groups.keys()).sort();

  // Set initial active group
  useEffect(() => {
    if (!activeGroup && sortedGroupKeys.length > 0) {
      setActiveGroup(sortedGroupKeys[0]);
    }
  }, [activeGroup, sortedGroupKeys]);

  // Get teams for current group
  function getGroupTeams(): Team[] {
    if (!activeGroup) return [];
    const { date, size } = parseGroupKey(activeGroup);
    return teams
      .filter((t) => t.competitionDate === date && t.size === size)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  // Get competitors assigned to any team in this group
  function getAssignedCompetitorIds(): Set<number> {
    const groupTeams = getGroupTeams();
    const assigned = new Set<number>();
    groupTeams.forEach((t) => {
      t.members.forEach((m) => assigned.add(m.competitorId));
    });
    return assigned;
  }

  // Get unassigned competitors for the active group
  function getPoolCompetitors(): TeamsPageCompetitor[] {
    if (!activeGroup) return [];
    const { date, size } = parseGroupKey(activeGroup);
    const assigned = getAssignedCompetitorIds();

    return competitors.filter((comp) => {
      if (assigned.has(comp.id)) return false;
      return comp.competitorTracks.some(
        (ct) =>
          ct.competitionTrack.isRelay &&
          ct.competitionTrack.competitionDate === date &&
          ct.competitionTrack.size === size
      );
    });
  }

  // Create a new team in the active group
  function handleCreateTeam() {
    if (!activeGroup) return;
    const { date, size } = parseGroupKey(activeGroup);
    const groupInfo = groups.get(activeGroup);
    const groupTeams = getGroupTeams();
    const newTeamNumber = groupTeams.length + 1;

    const newTeam: Team = {
      competitionDate: date,
      size: size,
      trackType: groupInfo?.trackType || "RELAY",
      teamName: `Voistk. ${newTeamNumber}`,
      sortOrder: newTeamNumber,
      members: [],
    };

    setTeams([...teams, newTeam]);
  }

  // Update team name
  function handleTeamNameChange(teamIndex: number, newName: string) {
    const updated = [...teams];
    updated[teamIndex] = { ...updated[teamIndex], teamName: newName };
    setTeams(updated);
  }

  // Find the actual index in the teams array for a group team
  function getTeamGlobalIndex(groupTeam: Team): number {
    return teams.findIndex(
      (t) =>
        t.competitionDate === groupTeam.competitionDate &&
        t.size === groupTeam.size &&
        t.teamName === groupTeam.teamName &&
        t.sortOrder === groupTeam.sortOrder
    );
  }

  // Add a competitor to a team
  function handleAddMember(groupTeam: Team, competitorId: number) {
    const comp = competitors.find((c) => c.id === competitorId);
    if (!comp) return;

    const globalIdx = getTeamGlobalIndex(groupTeam);
    if (globalIdx === -1) return;

    const updated = [...teams];
    const team = { ...updated[globalIdx] };
    const newMember: TeamMember = {
      id: 0,
      competitorId: comp.id,
      sortOrder: team.members.length + 1,
      competitor: {
        id: comp.id,
        handler: { handlerName: comp.handler.handlerName, clubName: comp.handler.clubName },
        dog: { nickName: comp.dog.nickName, sizeEst: comp.dog.sizeEst, breed: null },
      },
    };
    team.members = [...team.members, newMember];
    updated[globalIdx] = team;
    setTeams(updated);
  }

  // Remove a member from a team
  function handleRemoveMember(groupTeam: Team, competitorId: number) {
    const globalIdx = getTeamGlobalIndex(groupTeam);
    if (globalIdx === -1) return;

    const updated = [...teams];
    const team = { ...updated[globalIdx] };
    team.members = team.members
      .filter((m) => m.competitorId !== competitorId)
      .map((m, i) => ({ ...m, sortOrder: i + 1 }));
    updated[globalIdx] = team;
    setTeams(updated);
  }

  // Move member within a team
  function handleMoveMember(groupTeam: Team, memberIdx: number, direction: "up" | "down") {
    const globalIdx = getTeamGlobalIndex(groupTeam);
    if (globalIdx === -1) return;

    const updated = [...teams];
    const team = { ...updated[globalIdx] };
    const members = [...team.members].sort((a, b) => a.sortOrder - b.sortOrder);

    const swapIdx = direction === "up" ? memberIdx - 1 : memberIdx + 1;
    if (swapIdx < 0 || swapIdx >= members.length) return;

    const tempSort = members[memberIdx].sortOrder;
    members[memberIdx] = { ...members[memberIdx], sortOrder: members[swapIdx].sortOrder };
    members[swapIdx] = { ...members[swapIdx], sortOrder: tempSort };

    team.members = members;
    updated[globalIdx] = team;
    setTeams(updated);
  }

  // Delete an entire team
  function handleDeleteTeam(groupTeam: Team) {
    const globalIdx = getTeamGlobalIndex(groupTeam);
    if (globalIdx === -1) return;
    if (!confirm(`Kas kustutada voistk. "${groupTeam.teamName}"?`)) return;

    const updated = teams.filter((_, i) => i !== globalIdx);
    setTeams(updated);
  }

  // Move team sort order (when locked — reorder queue position)
  function handleMoveTeam(groupTeam: Team, direction: "up" | "down") {
    const groupTeams = getGroupTeams();
    const idx = groupTeams.findIndex(
      (t) => t.teamName === groupTeam.teamName && t.sortOrder === groupTeam.sortOrder
    );
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= groupTeams.length) return;

    const globalIdx1 = getTeamGlobalIndex(groupTeams[idx]);
    const globalIdx2 = getTeamGlobalIndex(groupTeams[swapIdx]);
    if (globalIdx1 === -1 || globalIdx2 === -1) return;

    const updated = [...teams];
    const tempSort = updated[globalIdx1].sortOrder;
    updated[globalIdx1] = { ...updated[globalIdx1], sortOrder: updated[globalIdx2].sortOrder };
    updated[globalIdx2] = { ...updated[globalIdx2], sortOrder: tempSort };
    setTeams(updated);
  }

  // Save teams
  async function handleSave() {
    setSaving(true);
    setMessage(null);

    const payload = {
      teams: teams.map((t) => ({
        competitionDate: t.competitionDate,
        size: t.size,
        trackType: t.trackType || "RELAY",
        teamName: t.teamName,
        sortOrder: t.sortOrder,
        members: t.members
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((m) => m.competitorId),
      })),
    };

    try {
      const res = await fetch(`/api/teams/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Voistkonnad salvestatud!" });
        fetchData();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Salvestamine ebaonnestus" });
      }
    } catch {
      setMessage({ type: "error", text: "Serveri viga" });
    } finally {
      setSaving(false);
    }
  }

  // Toggle lock
  async function handleToggleLock() {
    setMessage(null);
    try {
      const res = await fetch(`/api/teams/${id}/lock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        setLocked(data.teamsLocked === 1);
        setMessage({
          type: "success",
          text: data.teamsLocked === 1 ? "Voistkonnad lukustatud!" : "Voistkonnad avatud!",
        });
        fetchData();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Lukustamine ebaonnestus" });
      }
    } catch {
      setMessage({ type: "error", text: "Serveri viga" });
    }
  }

  // Toggle publish
  async function handleTogglePublish() {
    setMessage(null);
    try {
      const res = await fetch(`/api/teams/${id}/publish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        setPublished(data.teamsPublished === 1);
        setMessage({
          type: "success",
          text: data.teamsPublished === 1 ? "Voistkonnad avaldatud!" : "Voistkonnad peidetud!",
        });
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Avaldamine ebaonnestus" });
      }
    } catch {
      setMessage({ type: "error", text: "Serveri viga" });
    }
  }

  if (loading) return <LoadingSkeleton titleWidth="w-64" blocks={2} blockHeight="h-64" />;

  const groupTeams = getGroupTeams();
  const poolCompetitors = getPoolCompetitors();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/organizer/competition/${id}`} className="text-blue-600 hover:text-blue-700 text-sm">
              &larr; Tagasi
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Voistkonnad</h1>
          {bookingName && <p className="text-sm text-gray-600">{bookingName}</p>}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Status badges */}
          <span
            className={`px-3 py-1.5 text-xs rounded-full font-medium ${
              locked
                ? "bg-red-100 text-red-700 border border-red-300"
                : "bg-gray-100 text-gray-600 border border-gray-300"
            }`}
          >
            {locked ? "Lukustatud" : "Avatud"}
          </span>
          <span
            className={`px-3 py-1.5 text-xs rounded-full font-medium ${
              published
                ? "bg-green-100 text-green-700 border border-green-300"
                : "bg-gray-100 text-gray-600 border border-gray-300"
            }`}
          >
            {published ? "Avaldatud" : "Avaldamata"}
          </span>

          {/* Action buttons */}
          <button
            onClick={handleToggleLock}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              locked
                ? "bg-yellow-100 text-yellow-700 border border-yellow-300 hover:bg-yellow-200"
                : "bg-red-100 text-red-700 border border-red-300 hover:bg-red-200"
            }`}
          >
            {locked ? "Ava lukust" : "Lukusta"}
          </button>
          <button
            onClick={handleTogglePublish}
            disabled={!locked}
            className={`px-4 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              published
                ? "bg-green-100 text-green-700 border border-green-300 hover:bg-green-200"
                : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
            }`}
            title={!locked ? "Voistkonnad peavad olema lukustatud enne avaldamist" : ""}
          >
            {published ? "Peida" : "Avalda"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || locked}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Salvestab..." : "Salvesta"}
          </button>
        </div>
      </div>

      {/* Message */}
      <MessageBanner message={message} />

      {/* No groups */}
      {sortedGroupKeys.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">
            Teatevoistluse radasid pole leitud. Lisage koigepealt teatevoistluse rajad.
          </p>
        </div>
      ) : (
        <>
          {/* Group tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {sortedGroupKeys.map((key) => {
              const { date, size } = parseGroupKey(key);
              const teamCount = teams.filter(
                (t) => t.competitionDate === date && t.size === size
              ).length;
              return (
                <FilterButton key={key} active={activeGroup === key} onClick={() => setActiveGroup(key)}>
                  {formatDate(date)} - {size}
                  {teamCount > 0 && (
                    <span className="ml-1.5 bg-white/30 px-1.5 py-0.5 rounded text-xs">
                      {teamCount}
                    </span>
                  )}
                </FilterButton>
              );
            })}
          </div>

          {activeGroup && (
            <div className="space-y-4">
              {/* Team cards */}
              {groupTeams.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                  <p className="text-gray-500">Selles grupis pole veel voistkondi.</p>
                </div>
              )}

              {groupTeams.map((team, teamIdx) => {
                const sortedMembers = [...team.members].sort((a, b) => a.sortOrder - b.sortOrder);
                const globalIdx = getTeamGlobalIndex(team);

                return (
                  <div
                    key={`${team.teamName}-${team.sortOrder}-${teamIdx}`}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                  >
                    {/* Team header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        {locked ? (
                          <>
                            {/* Reorder team buttons when locked */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleMoveTeam(team, "up")}
                                disabled={teamIdx === 0}
                                className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Liiguta ules"
                              >
                                <ArrowUpIcon />
                              </button>
                              <button
                                onClick={() => handleMoveTeam(team, "down")}
                                disabled={teamIdx === groupTeams.length - 1}
                                className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Liiguta alla"
                              >
                                <ArrowDownIcon />
                              </button>
                            </div>
                            <h3 className="text-base font-semibold text-gray-900">{team.teamName}</h3>
                          </>
                        ) : (
                          <input
                            type="text"
                            value={team.teamName}
                            onChange={(e) => {
                              if (globalIdx !== -1) handleTeamNameChange(globalIdx, e.target.value);
                            }}
                            className="text-base font-semibold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 transition-colors"
                          />
                        )}
                        <span className="text-xs text-gray-500">
                          {sortedMembers.length} liiget
                        </span>
                        {sortedMembers.length < 3 && (
                          <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
                            Min 3 liiget
                          </span>
                        )}
                        {sortedMembers.length > 4 && (
                          <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                            Max 4 liiget
                          </span>
                        )}
                      </div>
                      {!locked && (
                        <button
                          onClick={() => handleDeleteTeam(team)}
                          className="text-sm text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                        >
                          Kustuta
                        </button>
                      )}
                    </div>

                    {/* Members list */}
                    <div className="divide-y divide-gray-100">
                      {sortedMembers.length === 0 && (
                        <div className="px-4 py-4 text-sm text-gray-400 text-center">
                          Lisa liikmeid allolevast andmebaasist
                        </div>
                      )}
                      {sortedMembers.map((member, memberIdx) => (
                        <div
                          key={member.competitorId}
                          className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400 w-5 text-right">{memberIdx + 1}.</span>
                            <div>
                              <span className="text-sm font-medium text-gray-900">
                                {member.competitor.handler.handlerName}
                              </span>
                              {member.competitor.handler.clubName && (
                                <span className="text-xs text-gray-500 ml-1.5">
                                  ({member.competitor.handler.clubName})
                                </span>
                              )}
                              <span className="text-xs text-gray-400 mx-1.5">&middot;</span>
                              <span className="text-sm text-gray-700">{member.competitor.dog.nickName}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {!locked && (
                              <>
                                <button
                                  onClick={() => handleMoveMember(team, memberIdx, "up")}
                                  disabled={memberIdx === 0}
                                  className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  title="Liiguta ules"
                                >
                                  <ArrowUpIcon />
                                </button>
                                <button
                                  onClick={() => handleMoveMember(team, memberIdx, "down")}
                                  disabled={memberIdx === sortedMembers.length - 1}
                                  className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  title="Liiguta alla"
                                >
                                  <ArrowDownIcon />
                                </button>
                                <button
                                  onClick={() => handleRemoveMember(team, member.competitorId)}
                                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors ml-1"
                                  title="Eemalda"
                                >
                                  <XIcon />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add member dropdown */}
                    {!locked && poolCompetitors.length > 0 && sortedMembers.length < 4 && (
                      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                        <select
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (val) {
                              handleAddMember(team, val);
                              e.target.value = "";
                            }
                          }}
                          defaultValue=""
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                          <option value="" disabled>
                            + Lisa liige...
                          </option>
                          {poolCompetitors.map((comp) => (
                            <option key={comp.id} value={comp.id}>
                              {comp.handler.handlerName} - {comp.dog.nickName}
                              {comp.handler.clubName ? ` (${comp.handler.clubName})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Create team button */}
              {!locked && (
                <button
                  onClick={handleCreateTeam}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                  + Lisa voistkond
                </button>
              )}

              {/* Unassigned pool */}
              {!locked && poolCompetitors.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Maaramata voistlejad ({poolCompetitors.length})
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {poolCompetitors.map((comp) => (
                      <div key={comp.id} className="flex items-center justify-between px-4 py-2.5">
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {comp.handler.handlerName}
                          </span>
                          {comp.handler.clubName && (
                            <span className="text-xs text-gray-500 ml-1.5">
                              ({comp.handler.clubName})
                            </span>
                          )}
                          <span className="text-xs text-gray-400 mx-1.5">&middot;</span>
                          <span className="text-sm text-gray-700">{comp.dog.nickName}</span>
                          {comp.dog.sizeEst && (
                            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                              {comp.dog.sizeEst}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary footer */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-500">
                  Kokku: {groupTeams.length} voistk. &middot;{" "}
                  {groupTeams.reduce((sum, t) => sum + t.members.length, 0)} liiget
                </p>
                {!locked && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? "Salvestab..." : "Salvesta"}
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm rounded-lg transition-colors ${
        active
          ? "bg-blue-600 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

function ArrowUpIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
