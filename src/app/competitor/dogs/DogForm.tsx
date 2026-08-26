"use client";

import type { Translations } from "@/i18n/translations/et";
import { SIZES, AGILITY_CLASSES, JUMP_CLASSES } from "@/lib/constants";
import type { Dog } from "@/types";

export function DogForm({
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
