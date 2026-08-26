"use client";

import { useState } from "react";

export function SettingsTab({
  initialRegStatus,
  initialRegCloseDate,
  onSave,
  onDelete,
}: {
  initialRegStatus: string;
  initialRegCloseDate: string;
  onSave: (regStatus: string, regCloseDate: string) => void;
  onDelete: () => void;
}) {
  const [regStatus, setRegStatus] = useState(initialRegStatus);
  const [regCloseDate, setRegCloseDate] = useState(initialRegCloseDate);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Registreerimise seaded</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Registreerimise staatus</label>
            <select
              value={regStatus}
              onChange={(e) => setRegStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="reg_open">Avatud</option>
              <option value="reg_closed">Suletud</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reg. sulgemise kuupäev</label>
            <input
              type="date"
              value={regCloseDate}
              onChange={(e) => setRegCloseDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => onSave(regStatus, regCloseDate)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            Salvesta seaded
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ohtlik tsoon</h2>
        <button
          onClick={onDelete}
          className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
        >
          Kustuta võistlus
        </button>
        <p className="text-xs text-gray-500 mt-2">Saab kustutada ainult siis, kui võistlejaid pole registreeritud.</p>
      </div>
    </div>
  );
}
