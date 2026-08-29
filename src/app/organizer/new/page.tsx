"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { COMPETITION_OFFICIALITY } from "@/lib/constants";
import { MessageBanner } from "@/components/ui/MessageBanner";
import { RefereeList } from "@/components/ui/RefereeList";

export default function NewCompetitionPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [referees, setReferees] = useState<string[]>([""]);

  const [form, setForm] = useState({
    organizerName: "",
    clubName: "",
    email: "",
    phone: "",
    location: "",
    competitionOfficiality: COMPETITION_OFFICIALITY[0],
    startDate: "",
    endDate: "",
    qualTime: "",
    regCloseDate: "",
    info: "",
    competitionClasses: "",
    status: "PENDING" as "PENDING" | "BOOKED" | "CLUBEVENT",
  });

  function update(field: string, value: string) {
    setForm({ ...form, [field]: value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          referee: referees.filter((r) => r.trim()),
        }),
      });

      if (res.ok) {
        const booking = await res.json();
        router.push(`/organizer/competition/${booking.id}`);
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Registreeri uus võistlus</h1>

      <MessageBanner message={message} />

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {/* Basic info */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Põhiandmed</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Korraldaja nimi *</label>
              <input
                type="text"
                value={form.organizerName}
                onChange={(e) => update("organizerName", e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Klubi nimi *</label>
              <input
                type="text"
                value={form.clubName}
                onChange={(e) => update("clubName", e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Võistlustüüp *</label>
              <select
                value={form.competitionOfficiality}
                onChange={(e) => update("competitionOfficiality", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {COMPETITION_OFFICIALITY.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-post *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon *</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Asukoht *</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Dates */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Kuupäevad</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alguskuupäev *</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => update("startDate", e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lõppkuupäev *</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => update("endDate", e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kvalifikatsiooni aeg</label>
              <input
                type="text"
                value={form.qualTime}
                onChange={(e) => update("qualTime", e.target.value)}
                placeholder="nt. 10:00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reg. sulgemise kuupäev</label>
              <input
                type="date"
                value={form.regCloseDate}
                onChange={(e) => update("regCloseDate", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Referees */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Kohtunikud</h2>
          <RefereeList referees={referees} onChange={setReferees} keepFirstRow />
        </div>

        {/* Status — admin only: an organizer's booking is a request, and the
            admin confirms it (PENDING -> BOOKED) or files a club event. */}
        {isAdmin && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Staatus</h2>
            <div className="flex gap-4">
              {[
                { value: "PENDING", label: "Ootel" },
                { value: "BOOKED", label: "Kinnitatud" },
                { value: "CLUBEVENT", label: "Klubiüritus" },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="status"
                    value={opt.value}
                    checked={form.status === opt.value}
                    onChange={(e) => update("status", e.target.value)}
                    className="text-blue-600"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Additional info */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Võistlusklassid</label>
          <input
            type="text"
            value={form.competitionClasses}
            onChange={(e) => update("competitionClasses", e.target.value)}
            placeholder="nt. A1, A2, A3"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lisainfo</label>
          <textarea
            value={form.info}
            onChange={(e) => update("info", e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Salvestamine..." : "Registreeri võistlus"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/organizer/competitions")}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
          >
            Tühista
          </button>
        </div>
      </form>
    </div>
  );
}
