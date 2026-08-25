"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "@/i18n/LanguageContext";
import type { MyRegistration } from "@/types";

export default function MyCompetitionsPage() {
  const { t, locale } = useTranslation();
  const [registrations, setRegistrations] = useState<MyRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-32 bg-gray-200 rounded" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

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
                  statusAccepted={t.myCompAccepted}
                  statusPending={t.myCompPending}
                  cancelLabel={t.cancel}
                  onCancel={() => handleCancel(r.id, r.dog.nickName)}
                  canCancel={r.status === "PENDING"}
                />
              ))}
            </Section>
          )}

          {past.length > 0 && (
            <Section title={t.myCompPast}>
              {past.map((r) => (
                <RegistrationCard
                  key={r.id}
                  reg={r}
                  locale={locale}
                  statusAccepted={t.myCompAccepted}
                  statusPending={t.myCompPending}
                  cancelLabel={t.cancel}
                  canCancel={false}
                />
              ))}
            </Section>
          )}
        </>
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

function RegistrationCard({
  reg,
  locale,
  statusAccepted,
  statusPending,
  cancelLabel,
  onCancel,
  canCancel,
}: {
  reg: MyRegistration;
  locale: string;
  statusAccepted: string;
  statusPending: string;
  cancelLabel: string;
  onCancel?: () => void;
  canCancel: boolean;
}) {
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
                {statusAccepted}
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                {statusPending}
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
          </p>
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
          {reg.competitorTracks.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {reg.competitorTracks.map((ct, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                >
                  {ct.competitionTrack.letter} - {ct.competitionTrack.trackType}{" "}
                  ({ct.competitionTrack.competitionType})
                </span>
              ))}
            </div>
          )}
        </div>
        {canCancel && onCancel && (
          <button
            onClick={onCancel}
            className="shrink-0 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            {cancelLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr: string, locale: string) {
  return new Date(dateStr).toLocaleDateString(locale === "en" ? "en-GB" : "et-EE");
}
