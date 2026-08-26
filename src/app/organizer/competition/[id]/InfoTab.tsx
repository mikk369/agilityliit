"use client";

import { useState } from "react";
import type { Booking } from "@/types";
import { RichTextEditor } from "@/components/ui/RichTextEditor";

export type BookingEditForm = {
  organizerName: string;
  clubName: string;
  email: string;
  phone: string;
  location: string;
  competitionType: string;
  info: string;
  competitionClasses: string;
};

function toEditForm(booking: Booking): BookingEditForm {
  return {
    organizerName: booking.organizerName,
    clubName: booking.clubName,
    email: booking.email,
    phone: booking.phone,
    location: booking.location,
    competitionType: booking.competitionType,
    info: booking.info || "",
    competitionClasses: booking.competitionClasses || "",
  };
}

export function InfoTab({
  booking,
  onSaveBooking,
  saving,
  onSaveInfo,
  savingInfo,
}: {
  booking: Booking;
  onSaveBooking: (form: BookingEditForm) => void;
  saving: boolean;
  onSaveInfo: (descriptionEst: string, descriptionEng: string) => void;
  savingInfo: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<BookingEditForm>(() => toEditForm(booking));
  const [descEst, setDescEst] = useState(booking.competitionInfo?.descriptionEst || "");
  const [descEng, setDescEng] = useState(booking.competitionInfo?.descriptionEng || "");

  return (
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setEditing(false);
              onSaveBooking(editForm);
            }}
            className="space-y-4"
          >
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
              <button type="button" onClick={() => { setEditForm(toEditForm(booking)); setEditing(false); }} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors">
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
            <RichTextEditor
              value={descEst}
              onChange={setDescEst}
              placeholder="Ajakava, majutus, toitlustus, lisainfo..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kirjeldus (ENG)</label>
            <RichTextEditor
              value={descEng}
              onChange={setDescEng}
              placeholder="Schedule, accommodation, catering, other info..."
            />
          </div>
          <button
            onClick={() => onSaveInfo(descEst, descEng)}
            disabled={savingInfo}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {savingInfo ? "Salvestamine..." : "Salvesta kirjeldused"}
          </button>
        </div>
      </div>
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
