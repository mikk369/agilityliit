"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "@/i18n/LanguageContext";
import { formatDate } from "@/lib/utils";
import type { MyRegistration } from "@/types";
import type { Translations } from "@/i18n/translations/et";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { TrackEditor } from "./TrackEditor";

export default function MyCompetitionsPage() {
  const { t, locale } = useTranslation();
  const [registrations, setRegistrations] = useState<MyRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editingTracksFor, setEditingTracksFor] = useState<MyRegistration | null>(null);

  useEffect(() => {
    fetchRegistrations();
  }, []);

  async function fetchRegistrations() {
    try {
      const res = await fetch("/api/competitors/my-bookings");
      if (res.ok) {
        setRegistrations(await res.json());
      } else if (res.status === 404) {
        setRegistrations([]);
      }
    } catch {
      setMessage({ type: "error", text: t.loadFailed });
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(id: number, dogName: string) {
    if (!confirm(t.myCompCancelConfirm(dogName))) return;

    try {
      const res = await fetch(`/api/competitors/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMessage({ type: "success", text: t.myCompCancelled });
        fetchRegistrations();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || t.myCompCancelFailed });
      }
    } catch {
      setMessage({ type: "error", text: t.serverError });
    }
  }

  async function handleSaveInfo(id: number, remarks: string) {
    try {
      const res = await fetch(`/api/competitors/${id}/info`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remarks }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: t.myCompInfoSaved });
        fetchRegistrations();
        return true;
      }
      const err = await res.json();
      setMessage({ type: "error", text: err.error || t.saveFailed });
    } catch {
      setMessage({ type: "error", text: t.serverError });
    }
    return false;
  }

  if (loading) return <LoadingSkeleton blocks={2} />;

  const upcoming = registrations.filter(
    (r) => new Date(r.booking.endDate) >= new Date()
  );
  const past = registrations.filter(
    (r) => new Date(r.booking.endDate) < new Date()
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t.myCompTitle}</h1>
        <Link
          href="/competitions"
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t.myCompRegister}
        </Link>
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

      {registrations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500 mb-4">{t.myCompNoRegistrations}</p>
          <Link
            href="/competitions"
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors inline-block"
          >
            {t.myCompBrowse}
          </Link>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <Section title={t.myCompUpcoming}>
              {upcoming.map((r) => (
                <RegistrationCard
                  key={r.id}
                  reg={r}
                  locale={locale}
                  t={t}
                  onCancel={() => handleCancel(r.id, r.dog.nickName)}
                  onEditTracks={() => setEditingTracksFor(r)}
                  onSaveInfo={(remarks) => handleSaveInfo(r.id, remarks)}
                />
              ))}
              <p className="text-xs text-gray-500">{t.myCompClosedNote}</p>
            </Section>
          )}

          {past.length > 0 && (
            <Section title={t.myCompPast}>
              {past.map((r) => (
                <RegistrationCard
                  key={r.id}
                  reg={r}
                  locale={locale}
                  t={t}
                />
              ))}
            </Section>
          )}
        </>
      )}

      {editingTracksFor && (
        <TrackEditor
          reg={editingTracksFor}
          locale={locale}
          t={t}
          onClose={() => setEditingTracksFor(null)}
          onSaved={() => {
            setEditingTracksFor(null);
            setMessage({ type: "success", text: t.myCompTracksSaved });
            fetchRegistrations();
          }}
          onError={(text) => {
            setEditingTracksFor(null);
            setMessage({ type: "error", text });
          }}
        />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

type TrackDay = {
  date: string;
  tracks: MyRegistration["competitorTracks"][number]["competitionTrack"][];
};

/** Tracks are listed per competition day, in the order the days run. */
function groupTracksByDay(competitorTracks: MyRegistration["competitorTracks"]): TrackDay[] {
  const days: TrackDay[] = [];
  for (const { competitionTrack } of competitorTracks) {
    const date = competitionTrack.competitionDate;
    const existing = days.find((d) => d.date === date);
    if (existing) {
      existing.tracks.push(competitionTrack);
    } else {
      days.push({ date, tracks: [competitionTrack] });
    }
  }
  return days.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Registration is closed once the organizer says so, or once the closing date
 * has passed - the status flag is only refreshed by a scheduled job, so the
 * date is checked even when the flag still says open.
 */
function isRegistrationOpen(booking: MyRegistration["booking"]): boolean {
  if (booking.regStatus && booking.regStatus !== "reg_open") return false;
  if (!booking.regCloseDate) return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(booking.regCloseDate) >= today;
}

function RegistrationCard({
  reg,
  locale,
  t,
  onCancel,
  onEditTracks,
  onSaveInfo,
}: {
  reg: MyRegistration;
  locale: string;
  t: Translations;
  onCancel?: () => void;
  onEditTracks?: () => void;
  onSaveInfo?: (remarks: string) => Promise<boolean>;
}) {
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoDraft, setInfoDraft] = useState(reg.remarks ?? "");
  const [savingInfo, setSavingInfo] = useState(false);

  const judges = reg.booking.referee ?? [];
  const trackDays = groupTracksByDay(reg.competitorTracks);
  // Everything a competitor may still change closes with registration.
  const editable = isRegistrationOpen(reg.booking);
  const registrationOpen = editable;

  async function submitInfo() {
    if (!onSaveInfo) return;
    setSavingInfo(true);
    const ok = await onSaveInfo(infoDraft);
    setSavingInfo(false);
    if (ok) setEditingInfo(false);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900">
              {reg.booking.organizerName}
            </h3>
            {reg.status === "ACCEPTED" ? (
              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                {t.myCompAccepted}
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                {t.myCompPending}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">
            {formatDate(reg.booking.startDate, locale)}
            {reg.booking.startDate !== reg.booking.endDate &&
              ` – ${formatDate(reg.booking.endDate, locale)}`}
            {" · "}
            {reg.booking.location}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {reg.booking.competitionType}
            {reg.booking.clubName && ` · ${reg.booking.clubName}`}
          </p>
          {judges.length > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {t.myCompJudges}: {judges.join(", ")}
            </p>
          )}
          {reg.booking.regCloseDate && (
            <p className="text-sm text-gray-600 mt-1">
              {t.myCompRegCloses}:{" "}
              <span className={registrationOpen ? "" : "text-red-600"}>
                {formatDate(reg.booking.regCloseDate, locale)}
                {!registrationOpen && ` (${t.myCompRegClosed})`}
              </span>
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              {reg.dog.nickName}
            </span>
            {reg.dog.sizeEst && (
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                {reg.dog.sizeEst}
              </span>
            )}
          </div>
          {trackDays.length > 0 && (
            <div className="mt-2 space-y-1">
              {trackDays.map((day) => (
                <div key={day.date} className="flex flex-wrap items-center gap-1">
                  <span className="text-xs text-gray-500 mr-1">
                    {formatDate(day.date, locale)}
                  </span>
                  {day.tracks.map((track, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                    >
                      {track.letter} - {track.trackType} ({track.competitionType})
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}
          <div className="mt-2">
            {editingInfo ? (
              <div className="space-y-2">
                <textarea
                  value={infoDraft}
                  onChange={(e) => setInfoDraft(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder={t.myCompAdditionalInfo}
                />
                <div className="flex gap-2">
                  <button
                    onClick={submitInfo}
                    disabled={savingInfo}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {t.save}
                  </button>
                  <button
                    onClick={() => {
                      setInfoDraft(reg.remarks ?? "");
                      setEditingInfo(false);
                    }}
                    disabled={savingInfo}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {t.cancel}
                  </button>
                </div>
              </div>
            ) : (
              (reg.remarks || (editable && onSaveInfo)) && (
                <p className="text-sm text-gray-600">
                  <span className="text-gray-500">{t.myCompAdditionalInfo}: </span>
                  {reg.remarks || "—"}
                  {editable && onSaveInfo && (
                    <button
                      onClick={() => setEditingInfo(true)}
                      className="ml-2 text-xs text-blue-600 hover:text-blue-700 underline"
                    >
                      {t.edit}
                    </button>
                  )}
                </p>
              )
            )}
          </div>
        </div>
        {editable && (onEditTracks || onCancel) && (
          <div className="shrink-0 flex items-center gap-2">
            {onEditTracks && (
              <button
                onClick={onEditTracks}
                className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                {t.myCompEditTracks}
              </button>
            )}
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                {t.myCompWithdraw}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
