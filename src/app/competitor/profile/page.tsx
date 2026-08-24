"use client";

import { useState, useEffect } from "react";

interface HandlerData {
  id?: number;
  handlerName: string;
  phone: string;
  email: string;
  clubName: string;
  country: string;
}

const COUNTRIES = [
  "EST", "FIN", "LAT", "LTU", "SWE", "NOR", "DNK", "DEU", "POL", "CZE",
  "SVK", "HUN", "AUT", "CHE", "FRA", "GBR", "IRL", "NLD", "BEL", "ITA",
  "ESP", "PRT", "ROU", "BGR", "HRV", "SRB", "SVN", "BIH", "MNE", "MKD",
  "ALB", "GRC", "TUR", "UKR", "BLR", "MDA", "RUS", "GEO", "ARM", "AZE",
  "KAZ", "ISL", "LUX", "MLT", "CYP",
];

export default function ProfilePage() {
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
      setMessage({ type: "error", text: "Andmete laadimine ebaõnnestus" });
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
        setMessage({ type: "success", text: isNew ? "Profiil loodud!" : "Profiil uuendatud!" });
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Minu andmed</h1>

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
            <InfoRow label="Nimi" value={handler.handlerName} />
            <InfoRow label="Telefon" value={handler.phone} />
            <InfoRow label="E-post" value={handler.email} />
            <InfoRow label="Klubi" value={handler.clubName} />
            <InfoRow label="Riik" value={handler.country} />
          </dl>
          <button
            onClick={() => setIsEditing(true)}
            className="mt-6 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            Muuda andmeid
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <FormField
            label="Nimi *"
            value={handler.handlerName}
            onChange={(v) => setHandler({ ...handler, handlerName: v })}
            required
          />
          <FormField
            label="Telefon"
            value={handler.phone}
            onChange={(v) => setHandler({ ...handler, phone: v })}
            type="tel"
          />
          <FormField
            label="E-post"
            value={handler.email}
            onChange={(v) => setHandler({ ...handler, email: v })}
            type="email"
          />
          <FormField
            label="Klubi"
            value={handler.clubName}
            onChange={(v) => setHandler({ ...handler, clubName: v })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Riik</label>
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
              {saving ? "Salvestamine..." : isNew ? "Loo profiil" : "Salvesta"}
            </button>
            {!isNew && (
              <button
                type="button"
                onClick={() => { setIsEditing(false); fetchHandler(); }}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
              >
                Tühista
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
