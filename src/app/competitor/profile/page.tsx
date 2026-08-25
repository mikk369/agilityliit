"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/i18n/LanguageContext";
import { COUNTRIES } from "@/lib/constants";

interface HandlerData {
  id?: number;
  handlerName: string;
  phone: string;
  email: string;
  clubName: string;
  country: string;
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const [handler, setHandler] = useState<HandlerData>({
    handlerName: "",
    phone: "",
    email: "",
    clubName: "",
    country: "EST",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isNew, setIsNew] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchHandler();
  }, []);

  async function fetchHandler() {
    try {
      const res = await fetch("/api/handlers/me");
      if (res.ok) {
        const data = await res.json();
        setHandler(data);
        setIsNew(false);
      } else if (res.status === 404) {
        setIsNew(true);
        setIsEditing(true);
      }
    } catch {
      setMessage({ type: "error", text: t.loadFailed });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const method = isNew ? "POST" : "PATCH";
      const res = await fetch("/api/handlers/me", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(handler),
      });

      if (res.ok) {
        const data = await res.json();
        setHandler(data);
        setIsNew(false);
        setIsEditing(false);
        setMessage({ type: "success", text: isNew ? t.profileCreated : t.profileUpdated });
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || t.saveFailed });
      }
    } catch {
      setMessage({ type: "error", text: t.serverError });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-40 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t.profileTitle}</h1>

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

      {!isEditing && !isNew ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <dl className="space-y-4">
            <InfoRow label={t.profileName} value={handler.handlerName} />
            <InfoRow label={t.profilePhone} value={handler.phone} />
            <InfoRow label={t.profileEmail} value={handler.email} />
            <InfoRow label={t.profileClub} value={handler.clubName} />
            <InfoRow label={t.profileCountry} value={handler.country} />
          </dl>
          <button
            onClick={() => setIsEditing(true)}
            className="mt-6 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t.profileEdit}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <FormField
            label={t.profileNameRequired}
            value={handler.handlerName}
            onChange={(v) => setHandler({ ...handler, handlerName: v })}
            required
          />
          <FormField
            label={t.profilePhone}
            value={handler.phone}
            onChange={(v) => setHandler({ ...handler, phone: v })}
            type="tel"
          />
          <FormField
            label={t.profileEmail}
            value={handler.email}
            onChange={(v) => setHandler({ ...handler, email: v })}
            type="email"
          />
          <FormField
            label={t.profileClub}
            value={handler.clubName}
            onChange={(v) => setHandler({ ...handler, clubName: v })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.profileCountry}</label>
            <select
              value={handler.country}
              onChange={(e) => setHandler({ ...handler, country: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? t.saving : isNew ? t.profileCreate : t.save}
            </button>
            {!isNew && (
              <button
                type="button"
                onClick={() => { setIsEditing(false); fetchHandler(); }}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
              >
                {t.cancel}
              </button>
            )}
          </div>
        </form>
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
  value?: string | null;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
}
