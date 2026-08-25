"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "@/i18n/LanguageContext";
import type { Translations } from "@/i18n/translations/et";
import { SIZES, AGILITY_CLASSES, JUMP_CLASSES } from "@/lib/constants";

interface Dog {
  id: number;
  nickName: string;
  officialName: string | null;
  breed: string | null;
  gender: string | null;
  birthday: string | null;
  sizeEst: string | null;
  sizeFci: string | null;
  agilityClass: string | null;
  jumpClass: string | null;
  registerCode: string | null;
  idCode: string | null;
  generalVaccinationEnd: string | null;
  rabiesVaccinationEnd: string | null;
  ownersName: string | null;
  info: string | null;
}


const emptyDog: Omit<Dog, "id"> = {
  nickName: "",
  officialName: "",
  breed: "",
  gender: "",
  birthday: "",
  sizeEst: "",
  sizeFci: "",
  agilityClass: "",
  jumpClass: "H0",
  registerCode: "",
  idCode: "",
  generalVaccinationEnd: "",
  rabiesVaccinationEnd: "",
  ownersName: "",
  info: "",
};

export default function DogsPage() {
  const { t, locale } = useTranslation();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Omit<Dog, "id">>(emptyDog);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [hasHandler, setHasHandler] = useState(true);

  useEffect(() => {
    fetchDogs();
  }, []);

  async function fetchDogs() {
    try {
      const res = await fetch("/api/dogs/me");
      if (res.ok) {
        const data = await res.json();
        setDogs(data);
      } else if (res.status === 404) {
        setHasHandler(false);
      }
    } catch {
      setMessage({ type: "error", text: t.dogsLoadFailed });
    } finally {
      setLoading(false);
    }
  }

  function startEdit(dog: Dog) {
    setEditingId(dog.id);
    setFormData({
      nickName: dog.nickName,
      officialName: dog.officialName || "",
      breed: dog.breed || "",
      gender: dog.gender || "",
      birthday: dog.birthday ? dog.birthday.split("T")[0] : "",
      sizeEst: dog.sizeEst || "",
      sizeFci: dog.sizeFci || "",
      agilityClass: dog.agilityClass || "",
      jumpClass: dog.jumpClass || "H0",
      registerCode: dog.registerCode || "",
      idCode: dog.idCode || "",
      generalVaccinationEnd: dog.generalVaccinationEnd ? dog.generalVaccinationEnd.split("T")[0] : "",
      rabiesVaccinationEnd: dog.rabiesVaccinationEnd ? dog.rabiesVaccinationEnd.split("T")[0] : "",
      ownersName: dog.ownersName || "",
      info: dog.info || "",
    });
    setShowForm(true);
  }

  function startAdd() {
    setEditingId(null);
    setFormData(emptyDog);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const url = editingId ? `/api/dogs/${editingId}` : "/api/dogs";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setMessage({ type: "success", text: editingId ? t.dogsUpdated : t.dogsAdded });
        setShowForm(false);
        setEditingId(null);
        fetchDogs();
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

  async function handleDelete(id: number, name: string) {
    if (!confirm(t.dogsDeleteConfirm(name))) return;

    try {
      const res = await fetch(`/api/dogs/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMessage({ type: "success", text: t.dogsDeleted });
        fetchDogs();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || t.deleteFailed });
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
          <div className="h-40 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!hasHandler) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{t.dogsTitle}</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            {t.dogsNeedProfile}{" "}
            <Link href="/competitor/profile" className="underline font-medium">
              {t.dogsHandlerProfile}
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t.dogsTitle}</h1>
        {!showForm && (
          <button
            onClick={startAdd}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t.dogsAdd}
          </button>
        )}
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

      {showForm && (
        <DogForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditingId(null); }}
          saving={saving}
          isEdit={!!editingId}
          t={t}
        />
      )}

      {dogs.length === 0 && !showForm ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500 mb-4">{t.dogsNoDogs}</p>
          <button
            onClick={startAdd}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t.dogsAddFirst}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {dogs.map((dog) => (
            <DogCard
              key={dog.id}
              dog={dog}
              locale={locale}
              t={t}
              onEdit={() => startEdit(dog)}
              onDelete={() => handleDelete(dog.id, dog.nickName)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ProgressionData {
  dogId: number;
  currentAgilityClass: string;
  currentJumpClass: string;
  agilityClearCount: number;
  agilityRequired: number;
  agilityNextClass: string | null;
  agilityEligible: boolean;
  agilityEligibleDate: string | null;
  jumpClearCount: number;
  jumpRequired: number;
  jumpNextClass: string | null;
  jumpEligible: boolean;
  jumpEligibleDate: string | null;
  seniorAgilityClearCount: number;
  seniorJumpClearCount: number;
  clearTracks: Array<{
    competitionName: string;
    trackName: string;
    date: string;
    timeSeconds: number;
    faults: number;
  }>;
}

function DogCard({
  dog,
  locale,
  t,
  onEdit,
  onDelete,
}: {
  dog: Dog;
  locale: string;
  t: Translations;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [progression, setProgression] = useState<ProgressionData | null>(null);
  const [progressionLoading, setProgressionLoading] = useState(false);
  const [progressionLoaded, setProgressionLoaded] = useState(false);

  useEffect(() => {
    if (expanded && !progressionLoaded) {
      setProgressionLoading(true);
      fetch(`/api/results/dog-progression/${dog.id}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setProgression(data);
          setProgressionLoaded(true);
        })
        .catch(() => setProgressionLoaded(true))
        .finally(() => setProgressionLoading(false));
    }
  }, [expanded, progressionLoaded, dog.id]);

  function isExpired(date: string | null) {
    if (!date) return true;
    return new Date(date) < new Date();
  }

  function isSoonExpiring(date: string | null) {
    if (!date) return false;
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);
    return new Date(date) < soon && !isExpired(date);
  }

  function vaccineStatus(date: string | null) {
    if (!date) return { text: t.dogsVaccMissing, className: "text-red-600" };
    if (isExpired(date)) return { text: t.dogsVaccExpired(formatDate(date, locale)), className: "text-red-600" };
    if (isSoonExpiring(date)) return { text: t.dogsVaccExpiringSoon(formatDate(date, locale)), className: "text-yellow-600" };
    return { text: formatDate(date, locale), className: "text-green-600" };
  }

  const generalVacc = vaccineStatus(dog.generalVaccinationEnd);
  const rabiesVacc = vaccineStatus(dog.rabiesVaccinationEnd);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600 shrink-0">
            <svg className={`w-5 h-5 transition-transform ${expanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{dog.nickName}</span>
              {dog.sizeEst && (
                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{dog.sizeEst}</span>
              )}
              {dog.agilityClass && (
                <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">{dog.agilityClass}</span>
              )}
              {dog.jumpClass && (
                <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">{dog.jumpClass}</span>
              )}
            </div>
            <p className="text-sm text-gray-500 truncate">
              {[dog.breed, dog.officialName].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onEdit} className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            {t.edit}
          </button>
          <button onClick={onDelete} className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            {t.delete}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <DetailItem label={t.dogsOfficialName} value={dog.officialName} />
            <DetailItem label={t.dogsBreed} value={dog.breed} />
            <DetailItem label={t.dogsGender} value={dog.gender === "M" ? t.dogsMale : dog.gender === "F" ? t.dogsFemale : dog.gender} />
            <DetailItem label={t.dogsBirthday} value={dog.birthday ? formatDate(dog.birthday, locale) : null} />
            <DetailItem label={t.dogsSizeEst} value={dog.sizeEst} />
            <DetailItem label={t.dogsSizeFci} value={dog.sizeFci} />
            <DetailItem label={t.dogsRegisterCode} value={dog.registerCode} />
            <DetailItem label={t.dogsIdCode} value={dog.idCode} />
            <DetailItem label={t.dogsOwner} value={dog.ownersName} />
            <div>
              <span className="text-gray-500">{t.dogsGeneralVaccShort}</span>
              <p className={`font-medium ${generalVacc.className}`}>{generalVacc.text}</p>
            </div>
            <div>
              <span className="text-gray-500">{t.dogsRabiesVaccShort}</span>
              <p className={`font-medium ${rabiesVacc.className}`}>{rabiesVacc.text}</p>
            </div>
          </div>
          {dog.info && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <span className="text-sm text-gray-500">{t.dogsNotes}:</span>
              <p className="text-sm text-gray-700">{dog.info}</p>
            </div>
          )}

          {/* Class Progression */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{t.progressionTitle}</h3>
            {progressionLoading ? (
              <div className="animate-pulse h-6 bg-gray-200 rounded w-48" />
            ) : progression ? (
              <div className="space-y-2">
                {/* Agility progression */}
                {progression.currentAgilityClass === "A3" ? (
                  <p className="text-xs text-gray-500">Agility: {t.progressionHighest("A3")}</p>
                ) : progression.agilityNextClass ? (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-600">
                        Agility: {progression.currentAgilityClass} → {progression.agilityNextClass}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({progression.agilityClearCount}/{progression.agilityRequired} {t.progressionClearTracks})
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div
                        className={`h-1.5 rounded-full ${
                          progression.agilityEligible ? "bg-green-500" : "bg-blue-500"
                        }`}
                        style={{
                          width: `${Math.min(100, (progression.agilityClearCount / progression.agilityRequired) * 100)}%`,
                        }}
                      />
                    </div>
                    {progression.agilityEligible && (
                      <p className="text-xs text-green-600 font-medium mt-1">
                        {t.progressionEligible}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Agility: {progression.currentAgilityClass || "—"}</p>
                )}

                {/* Jump progression */}
                {progression.currentJumpClass === "H0" ? (
                  <p className="text-xs text-gray-500">Jumping: {t.progressionJumpH0}</p>
                ) : progression.currentJumpClass === "H3" ? (
                  <p className="text-xs text-gray-500">Jumping: {t.progressionHighest("H3")}</p>
                ) : progression.jumpNextClass ? (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-600">
                        Jumping: {progression.currentJumpClass} → {progression.jumpNextClass}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({progression.jumpClearCount}/{progression.jumpRequired} {t.progressionClearTracks})
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div
                        className={`h-1.5 rounded-full ${
                          progression.jumpEligible ? "bg-green-500" : "bg-orange-500"
                        }`}
                        style={{
                          width: `${Math.min(100, (progression.jumpClearCount / progression.jumpRequired) * 100)}%`,
                        }}
                      />
                    </div>
                    {progression.jumpEligible && (
                      <p className="text-xs text-green-600 font-medium mt-1">
                        {t.progressionEligible}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Jumping: {progression.currentJumpClass || "—"}</p>
                )}

                {/* Senior counts */}
                {(progression.seniorAgilityClearCount > 0 || progression.seniorJumpClearCount > 0) && (
                  <div className="text-xs text-gray-500">
                    {progression.seniorAgilityClearCount > 0 && (
                      <span>{t.progressionSeniorA(progression.seniorAgilityClearCount)} </span>
                    )}
                    {progression.seniorJumpClearCount > 0 && (
                      <span>{t.progressionSeniorH(progression.seniorJumpClearCount)}</span>
                    )}
                  </div>
                )}

                {/* Clean tracks list */}
                {progression.clearTracks.length > 0 && (
                  <details className="mt-1">
                    <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-700">
                      {t.progressionClearTracksList(progression.clearTracks.length)}
                    </summary>
                    <div className="mt-1 space-y-0.5">
                      {progression.clearTracks.map((tr, i) => (
                        <div key={i} className="text-xs text-gray-600 flex gap-2">
                          <span className="text-gray-400">{formatDate(tr.date, locale)}</span>
                          <span>{tr.competitionName}</span>
                          <span className="text-gray-400">{tr.trackName}</span>
                          <span className="font-mono">{tr.timeSeconds.toFixed(2)}s</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400">{t.noData}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-gray-500">{label}</span>
      <p className="font-medium text-gray-900">{value || "—"}</p>
    </div>
  );
}

function DogForm({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  saving,
  isEdit,
  t,
}: {
  formData: Omit<Dog, "id">;
  setFormData: (d: Omit<Dog, "id">) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  saving: boolean;
  isEdit: boolean;
  t: Translations;
}) {
  function update(field: string, value: string) {
    setFormData({ ...formData, [field]: value });
  }

  const GENDERS = [
    { value: "M", label: t.dogsMale },
    { value: "F", label: t.dogsFemale },
  ];

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {isEdit ? t.dogsFormEditTitle : t.dogsFormAddTitle}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.dogsNickName}</label>
          <input
            type="text"
            value={formData.nickName}
            onChange={(e) => update("nickName", e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.dogsOfficialName}</label>
          <input
            type="text"
            value={formData.officialName || ""}
            onChange={(e) => update("officialName", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.dogsBreed}</label>
          <input
            type="text"
            value={formData.breed || ""}
            onChange={(e) => update("breed", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.dogsGender}</label>
          <div className="flex gap-4 pt-2">
            {GENDERS.map((g) => (
              <label key={g.value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="gender"
                  value={g.value}
                  checked={formData.gender === g.value}
                  onChange={(e) => update("gender", e.target.value)}
                  className="text-blue-600"
                />
                {g.label}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.dogsBirthday}</label>
          <input
            type="date"
            value={formData.birthday || ""}
            onChange={(e) => update("birthday", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.dogsOwner}</label>
          <input
            type="text"
            value={formData.ownersName || ""}
            onChange={(e) => update("ownersName", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.dogsSizeEst}</label>
          <select
            value={formData.sizeEst || ""}
            onChange={(e) => update("sizeEst", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">{t.dogsSelectSize}</option>
            {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.dogsSizeFci}</label>
          <select
            value={formData.sizeFci || ""}
            onChange={(e) => update("sizeFci", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">{t.dogsSelectSize}</option>
            {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.dogsAgilityClass}</label>
          <select
            value={formData.agilityClass || ""}
            onChange={(e) => update("agilityClass", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {AGILITY_CLASSES.map((c) => <option key={c} value={c}>{c || "—"}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.dogsJumpingClass}</label>
          <select
            value={formData.jumpClass || "H0"}
            onChange={(e) => update("jumpClass", e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {JUMP_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.dogsRegisterCode}</label>
          <input
            type="text"
            value={formData.registerCode || ""}
            onChange={(e) => update("registerCode", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.dogsIdCode}</label>
          <input
            type="text"
            value={formData.idCode || ""}
            onChange={(e) => update("idCode", e.target.value)}
            maxLength={15}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.dogsGeneralVacc}</label>
          <input
            type="date"
            value={formData.generalVaccinationEnd || ""}
            onChange={(e) => update("generalVaccinationEnd", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.dogsRabiesVacc}</label>
          <input
            type="date"
            value={formData.rabiesVaccinationEnd || ""}
            onChange={(e) => update("rabiesVaccinationEnd", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">{t.dogsNotes}</label>
        <textarea
          value={formData.info || ""}
          onChange={(e) => update("info", e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="flex gap-3 mt-6">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? t.saving : isEdit ? t.save : t.dogsAddSubmit}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
        >
          {t.cancel}
        </button>
      </div>
    </form>
  );
}

function formatDate(dateStr: string, locale: string) {
  return new Date(dateStr).toLocaleDateString(locale === "en" ? "en-GB" : "et-EE");
}
