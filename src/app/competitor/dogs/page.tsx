"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "@/i18n/LanguageContext";
import type { Dog } from "@/types";
import { MessageBanner } from "@/components/ui/MessageBanner";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { DogCard } from "./DogCard";
import { DogForm } from "./DogForm";


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

  if (loading) return <LoadingSkeleton blockHeight="h-40" />;

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

      <MessageBanner message={message} />

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
