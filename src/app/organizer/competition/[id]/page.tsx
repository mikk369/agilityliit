"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Booking, CompetitionTrack } from "@/types";
import { formatDate } from "@/lib/utils";
import { MessageBanner } from "@/components/ui/MessageBanner";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { InfoTab, type BookingEditForm } from "./InfoTab";
import { TrackForm, type TrackFormData, type NewTracksData } from "./TrackForm";
import { TrackTable } from "./TrackTable";
import { SettingsTab } from "./SettingsTab";
import { MaxPerDayPanel } from "./MaxPerDayPanel";
import { refereeOptions } from "@/components/ui/RefereeList";

const SUBPAGES = [
  { segment: "competitors", label: "Võistlejad" },
  { segment: "protocol", label: "Protokoll" },
  { segment: "results", label: "Tulemused" },
  { segment: "teams", label: "Võistkonnad" },
  { segment: "awardings", label: "Autasustamine" },
  { segment: "measurements", label: "Mõõtmised" },
  { segment: "ajakava", label: "Ajakava" },
];

export default function CompetitionEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "tracks" | "settings">("info");
  const [saving, setSaving] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [showTrackForm, setShowTrackForm] = useState(false);
  const [savingTrack, setSavingTrack] = useState(false);
  const [editingTrack, setEditingTrack] = useState<CompetitionTrack | null>(null);

  useEffect(() => {
    fetchBooking();
  }, [id]);

  async function fetchBooking() {
    try {
      const res = await fetch(`/api/bookings/${id}`);
      if (res.ok) {
        setBooking(await res.json());
      } else {
        setMessage({ type: "error", text: "Võistlust ei leitud" });
      }
    } catch {
      setMessage({ type: "error", text: "Andmete laadimine ebaõnnestus" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveBooking(form: BookingEditForm) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Andmed salvestatud!" });
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

  async function handleSaveInfo(descriptionEst: string, descriptionEng: string) {
    setSavingInfo(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/competitions/${id}/info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptionEst, descriptionEng }),
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

  /**
   * One form row becomes one track per size group, all sharing the row's
   * letter — the same expansion the WordPress editor does on save.
   */
  async function handleAddTracks({ sizes, ...row }: NewTracksData) {
    setSavingTrack(true);
    setMessage(null);
    try {
      const failed: string[] = [];
      for (const size of sizes) {
        const res = await fetch(`/api/competitions/${id}/tracks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...row, size }),
        });
        if (!res.ok) failed.push(size);
      }

      if (failed.length === 0) {
        setMessage({
          type: "success",
          text: sizes.length === 1 ? "Rada lisatud!" : `${sizes.length} rada lisatud!`,
        });
        setShowTrackForm(false);
      } else {
        // Some sizes may have been created before one failed, so the table is
        // reloaded either way and the message names what did not go through.
        setMessage({
          type: "error",
          text: `Neid suurusrühmi ei õnnestunud lisada: ${failed.join(", ")}`,
        });
      }
      fetchBooking();
    } catch {
      setMessage({ type: "error", text: "Serveri viga" });
    } finally {
      setSavingTrack(false);
    }
  }

  async function handleUpdateTrack(data: TrackFormData) {
    if (!editingTrack) return;
    setSavingTrack(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/competitions/${id}/tracks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, trackId: editingTrack.id }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Rada salvestatud!" });
        setEditingTrack(null);
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

  async function handleSaveRegSettings(regStatus: string, regCloseDate: string) {
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

  async function handleDeleteCompetition() {
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
  }

  if (loading) return <LoadingSkeleton titleWidth="w-64" blockHeight="h-48" />;

  if (!booking) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-gray-500">Võistlust ei leitud.</p>
      </div>
    );
  }

  // Letters already on each day, so the add form can offer a free one.
  const usedLetters = booking.competitionTracks.reduce(
    (acc, track) => {
      const date = track.competitionDate.split("T")[0];
      (acc[date] ??= []).push(track.letter);
      return acc;
    },
    {} as Record<string, string[]>
  );

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
          {booking.status === "PENDING" && (
            <p className="mt-2 inline-block text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">
              Võistlus ootab admini kinnitust
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {SUBPAGES.map(({ segment, label }) => (
            <Link
              key={segment}
              href={`/organizer/competition/${id}/${segment}`}
              className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <MessageBanner message={message} />

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

      {activeTab === "info" && (
        <InfoTab
          booking={booking}
          onSaveBooking={handleSaveBooking}
          saving={saving}
          onSaveInfo={handleSaveInfo}
          savingInfo={savingInfo}
        />
      )}

      {activeTab === "tracks" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Rajad</h2>
            {!showTrackForm && !editingTrack && (
              <button
                onClick={() => setShowTrackForm(true)}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Lisa rada
              </button>
            )}
          </div>

          {showTrackForm && (
            <TrackForm
              defaultDate={booking.startDate ? booking.startDate.split("T")[0] : ""}
              referees={refereeOptions(booking.referee)}
              usedLetters={usedLetters}
              onAdd={handleAddTracks}
              onCancel={() => setShowTrackForm(false)}
              saving={savingTrack}
            />
          )}

          {editingTrack && (
            <TrackForm
              // A new track means a new form: without this the fields
              // would keep the previously edited track’s values.
              key={editingTrack.id}
              defaultDate={editingTrack.competitionDate.split("T")[0]}
              referees={refereeOptions(booking.referee)}
              initial={{
                competitionDate: editingTrack.competitionDate.split("T")[0],
                letter: editingTrack.letter,
                trackType: editingTrack.trackType,
                size: editingTrack.size,
                officiality: editingTrack.officiality,
                referee: editingTrack.referee || "",
                sizeStandard: editingTrack.sizeStandard || "EST",
                isRelay: editingTrack.isRelay,
              }}
              onSubmit={handleUpdateTrack}
              onCancel={() => setEditingTrack(null)}
              saving={savingTrack}
            />
          )}

          <TrackTable
            tracks={booking.competitionTracks}
            onEdit={(track) => {
              setShowTrackForm(false);
              setEditingTrack(track);
            }}
            onDelete={handleDeleteTrack}
          />
        </div>
      )}

      {activeTab === "settings" && (
        <div className="space-y-6">
          <MaxPerDayPanel bookingId={id} onMessage={setMessage} />
          <SettingsTab
            initialRegStatus={booking.regStatus || "reg_open"}
            initialRegCloseDate={booking.regCloseDate ? booking.regCloseDate.split("T")[0] : ""}
            bookingStatus={booking.status}
            onSave={handleSaveRegSettings}
            onDelete={handleDeleteCompetition}
          />
        </div>
      )}
    </div>
  );
}
