"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Booking {
  id: number;
  startDate: string;
  endDate: string;
  qualTime: string | null;
  organizerName: string;
  clubName: string;
  email: string;
  phone: string;
  location: string;
  referee: string[];
  info: string | null;
  competitionClasses: string | null;
  competitionType: string;
  status: string;
  regStatus: string | null;
  regCloseDate: string | null;
  competitionInfo: CompetitionInfo | null;
  competitionTracks: CompetitionTrack[];
}

interface CompetitionInfo {
  id: number;
  descriptionEst: string | null;
  descriptionEng: string | null;
  sponsorImages: unknown;
  maxCompetitorsPerDay: Record<string, number> | null;
}

interface CompetitionTrack {
  id: number;
  competitionDate: string;
  letter: string;
  trackType: string;
  size: string;
  competitionType: string;
  referee: string | null;
  sizeStandard: string | null;
  sortOrder: number;
  isRelay: boolean;
}

const SIZES = ["XS", "S", "M", "SL", "L"];
const TRACK_TYPES = ["agility", "jumping"];
const COMPETITION_CLASSES = ["A0", "A1", "A2", "A3"];
const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

export default function CompetitionEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "tracks" | "settings">("info");

  // Edit mode for booking info
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    organizerName: "",
    clubName: "",
    email: "",
    phone: "",
    location: "",
    competitionType: "",
    info: "",
    competitionClasses: "",
  });
  const [saving, setSaving] = useState(false);

  // Competition info (descriptions)
  const [descEst, setDescEst] = useState("");
  const [descEng, setDescEng] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);

  // Track form
  const [showTrackForm, setShowTrackForm] = useState(false);
  const [trackForm, setTrackForm] = useState({
    competitionDate: "",
    letter: "A",
    trackType: "agility",
    size: "S",
    competitionType: "A1",
    referee: "",
    sizeStandard: "EST",
    isRelay: false,
  });
  const [savingTrack, setSavingTrack] = useState(false);

  // Reg settings
  const [regStatus, setRegStatus] = useState<string>("");
  const [regCloseDate, setRegCloseDate] = useState("");

  useEffect(() => {
    fetchBooking();
  }, [id]);

  async function fetchBooking() {
    try {
      const res = await fetch(`/api/bookings/${id}`);
      if (res.ok) {
        const data: Booking = await res.json();
        setBooking(data);
        setEditForm({
          organizerName: data.organizerName,
          clubName: data.clubName,
          email: data.email,
          phone: data.phone,
          location: data.location,
          competitionType: data.competitionType,
          info: data.info || "",
          competitionClasses: data.competitionClasses || "",
        });
        setDescEst(data.competitionInfo?.descriptionEst || "");
        setDescEng(data.competitionInfo?.descriptionEng || "");
        setRegStatus(data.regStatus || "reg_open");
        setRegCloseDate(data.regCloseDate ? data.regCloseDate.split("T")[0] : "");
        if (!trackForm.competitionDate && data.startDate) {
          setTrackForm((f) => ({ ...f, competitionDate: data.startDate.split("T")[0] }));
        }
      } else {
        setMessage({ type: "error", text: "Võistlust ei leitud" });
      }
    } catch {
      setMessage({ type: "error", text: "Andmete laadimine ebaõnnestus" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveBooking(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Andmed salvestatud!" });
        setEditing(false);
        fetchBooking();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Salvestamine ebaõnnestus" });
      }
    } catch {
      setMessage({ type: "error", text: "Serveri viga" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveInfo() {
    setSavingInfo(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/competitions/${id}/info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descriptionEst: descEst,
          descriptionEng: descEng,
        }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Kirjeldused salvestatud!" });
        fetchBooking();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Salvestamine ebaõnnestus" });
      }
    } catch {
      setMessage({ type: "error", text: "Serveri viga" });
    } finally {
      setSavingInfo(false);
    }
  }

  async function handleAddTrack(e: React.FormEvent) {
    e.preventDefault();
    setSavingTrack(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/competitions/${id}/tracks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trackForm),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Rada lisatud!" });
        setShowTrackForm(false);
        fetchBooking();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Salvestamine ebaõnnestus" });
      }
    } catch {
      setMessage({ type: "error", text: "Serveri viga" });
    } finally {
      setSavingTrack(false);
    }
  }

  async function handleDeleteTrack(trackId: number) {
    if (!confirm("Kas oled kindel, et soovid selle raja kustutada?")) return;
    try {
      const res = await fetch(`/api/competitions/${id}/tracks`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Rada kustutatud!" });
        fetchBooking();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Kustutamine ebaõnnestus" });
      }
    } catch {
      setMessage({ type: "error", text: "Serveri viga" });
    }
  }

  async function handleSaveRegSettings() {
    setMessage(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regStatus: regStatus || null,
          regCloseDate: regCloseDate || null,
        }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Registreerimise seaded salvestatud!" });
        fetchBooking();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Salvestamine ebaõnnestus" });
      }
    } catch {
      setMessage({ type: "error", text: "Serveri viga" });
    }
  }

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

  if (!booking) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-gray-500">Võistlust ei leitud.</p>
      </div>
    );
  }

  // Group tracks by date
  const tracksByDate: Record<string, CompetitionTrack[]> = {};
  booking.competitionTracks.forEach((t) => {
    const date = t.competitionDate.split("T")[0];
    if (!tracksByDate[date]) tracksByDate[date] = [];
    tracksByDate[date].push(t);
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{booking.organizerName}</h1>
          <p className="text-sm text-gray-600">
            {formatDate(booking.startDate)}
            {booking.startDate !== booking.endDate && ` – ${formatDate(booking.endDate)}`}
            {" · "}{booking.location}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/organizer/competition/${id}/competitors`}
            className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Võistlejad
          </Link>
          <Link
            href={`/organizer/competition/${id}/ajakava`}
            className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Ajakava
          </Link>
        </div>
      </div>

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

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[
          { key: "info" as const, label: "Põhiinfo" },
          { key: "tracks" as const, label: `Rajad (${booking.competitionTracks.length})` },
          { key: "settings" as const, label: "Seaded" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Info */}
      {activeTab === "info" && (
        <div className="space-y-6">
          {/* Booking details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Võistluse andmed</h2>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  Muuda
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSaveBooking} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Korraldaja nimi" value={editForm.organizerName} onChange={(v) => setEditForm({ ...editForm, organizerName: v })} required />
                  <FormField label="Klubi" value={editForm.clubName} onChange={(v) => setEditForm({ ...editForm, clubName: v })} required />
                  <FormField label="E-post" value={editForm.email} onChange={(v) => setEditForm({ ...editForm, email: v })} type="email" required />
                  <FormField label="Telefon" value={editForm.phone} onChange={(v) => setEditForm({ ...editForm, phone: v })} required />
                  <FormField label="Asukoht" value={editForm.location} onChange={(v) => setEditForm({ ...editForm, location: v })} required />
                  <FormField label="Võistluse tüüp" value={editForm.competitionType} onChange={(v) => setEditForm({ ...editForm, competitionType: v })} required />
                </div>
                <FormField label="Võistlusklassid" value={editForm.competitionClasses} onChange={(v) => setEditForm({ ...editForm, competitionClasses: v })} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lisainfo</label>
                  <textarea
                    value={editForm.info}
                    onChange={(e) => setEditForm({ ...editForm, info: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {saving ? "Salvestamine..." : "Salvesta"}
                  </button>
                  <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors">
                    Tühista
                  </button>
                </div>
              </form>
            ) : (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow label="Korraldaja" value={booking.organizerName} />
                <InfoRow label="Klubi" value={booking.clubName} />
                <InfoRow label="E-post" value={booking.email} />
                <InfoRow label="Telefon" value={booking.phone} />
                <InfoRow label="Asukoht" value={booking.location} />
                <InfoRow label="Võistluse tüüp" value={booking.competitionType} />
                <InfoRow label="Staatus" value={booking.status} />
                <InfoRow label="Kohtunikud" value={(booking.referee as string[])?.join(", ") || "—"} />
                {booking.competitionClasses && (
                  <InfoRow label="Võistlusklassid" value={booking.competitionClasses} />
                )}
                {booking.info && (
                  <div className="sm:col-span-2">
                    <InfoRow label="Lisainfo" value={booking.info} />
                  </div>
                )}
              </dl>
            )}
          </div>

          {/* Competition descriptions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Kirjeldused</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kirjeldus (EST)</label>
                <textarea
                  value={descEst}
                  onChange={(e) => setDescEst(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kirjeldus (ENG)</label>
                <textarea
                  value={descEng}
                  onChange={(e) => setDescEng(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                onClick={handleSaveInfo}
                disabled={savingInfo}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {savingInfo ? "Salvestamine..." : "Salvesta kirjeldused"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Tracks */}
      {activeTab === "tracks" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Rajad</h2>
            {!showTrackForm && (
              <button
                onClick={() => setShowTrackForm(true)}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Lisa rada
              </button>
            )}
          </div>

          {showTrackForm && (
            <form onSubmit={handleAddTrack} className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Lisa uus rada</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kuupäev *</label>
                  <input
                    type="date"
                    value={trackForm.competitionDate}
                    onChange={(e) => setTrackForm({ ...trackForm, competitionDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Täht *</label>
                  <select
                    value={trackForm.letter}
                    onChange={(e) => setTrackForm({ ...trackForm, letter: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {LETTERS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tüüp *</label>
                  <select
                    value={trackForm.trackType}
                    onChange={(e) => setTrackForm({ ...trackForm, trackType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {TRACK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Suurus *</label>
                  <select
                    value={trackForm.size}
                    onChange={(e) => setTrackForm({ ...trackForm, size: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Klass *</label>
                  <select
                    value={trackForm.competitionType}
                    onChange={(e) => setTrackForm({ ...trackForm, competitionType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {COMPETITION_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kohtunik</label>
                  <input
                    type="text"
                    value={trackForm.referee}
                    onChange={(e) => setTrackForm({ ...trackForm, referee: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Suurusstandard</label>
                  <select
                    value={trackForm.sizeStandard}
                    onChange={(e) => setTrackForm({ ...trackForm, sizeStandard: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="EST">EST</option>
                    <option value="FCI">FCI</option>
                  </select>
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={trackForm.isRelay}
                      onChange={(e) => setTrackForm({ ...trackForm, isRelay: e.target.checked })}
                      className="text-blue-600 rounded"
                    />
                    Teaterada
                  </label>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button type="submit" disabled={savingTrack} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {savingTrack ? "Lisamine..." : "Lisa rada"}
                </button>
                <button type="button" onClick={() => setShowTrackForm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors">
                  Tühista
                </button>
              </div>
            </form>
          )}

          {Object.keys(tracksByDate).length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-gray-500">Radu pole veel lisatud.</p>
            </div>
          ) : (
            Object.entries(tracksByDate)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, tracks]) => (
                <div key={date} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700">{formatDate(date)}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-left">
                          <th className="px-4 py-2 font-medium text-gray-600">Täht</th>
                          <th className="px-4 py-2 font-medium text-gray-600">Tüüp</th>
                          <th className="px-4 py-2 font-medium text-gray-600">Suurus</th>
                          <th className="px-4 py-2 font-medium text-gray-600">Klass</th>
                          <th className="px-4 py-2 font-medium text-gray-600">Kohtunik</th>
                          <th className="px-4 py-2 font-medium text-gray-600">Standard</th>
                          <th className="px-4 py-2 font-medium text-gray-600"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {tracks.map((track) => (
                          <tr key={track.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-4 py-2 font-semibold">{track.letter}</td>
                            <td className="px-4 py-2">{track.trackType}</td>
                            <td className="px-4 py-2">
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">{track.size}</span>
                            </td>
                            <td className="px-4 py-2">{track.competitionType}</td>
                            <td className="px-4 py-2">{track.referee || "—"}</td>
                            <td className="px-4 py-2">{track.sizeStandard || "—"}</td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-1">
                                {track.isRelay && (
                                  <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">Teaterada</span>
                                )}
                                <button
                                  onClick={() => handleDeleteTrack(track.id)}
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
              ))
          )}
        </div>
      )}

      {/* Tab: Settings */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Registreerimise seaded</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registreerimise staatus</label>
                <select
                  value={regStatus}
                  onChange={(e) => setRegStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="reg_open">Avatud</option>
                  <option value="reg_closed">Suletud</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reg. sulgemise kuupäev</label>
                <input
                  type="date"
                  value={regCloseDate}
                  onChange={(e) => setRegCloseDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                onClick={handleSaveRegSettings}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                Salvesta seaded
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ohtlik tsoon</h2>
            <button
              onClick={async () => {
                if (!confirm("Kas oled kindel? Seda ei saa tagasi võtta!")) return;
                try {
                  const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
                  if (res.ok) {
                    router.push("/organizer/competitions");
                  } else {
                    const err = await res.json();
                    setMessage({ type: "error", text: err.error || "Kustutamine ebaõnnestus" });
                  }
                } catch {
                  setMessage({ type: "error", text: "Serveri viga" });
                }
              }}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
            >
              Kustuta võistlus
            </button>
            <p className="text-xs text-gray-500 mt-2">Saab kustutada ainult siis, kui võistlejaid pole registreeritud.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900">{value || "—"}</dd>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required ? " *" : ""}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("et-EE");
}
