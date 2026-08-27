"use client";

import { useState } from "react";

export function SettingsTab({
  initialRegStatus,
  initialRegCloseDate,
  bookingStatus,
  onSave,
  onDelete,
}: {
  initialRegStatus: string;
  initialRegCloseDate: string;
  /** PENDING / BOOKED / CLUBEVENT — only an admin moves PENDING to BOOKED. */
  bookingStatus: string;
  onSave: (regStatus: string, regCloseDate: string) => void;
  onDelete: () => void;
}) {
  const [regStatus, setRegStatus] = useState(initialRegStatus);
  const [regCloseDate, setRegCloseDate] = useState(initialRegCloseDate);

  // Registration cannot open before the admin confirms the date reservation —
  // isRegistrationOpen() refuses anything that is not BOOKED, so letting the
  // organizer flip regStatus here would only produce a setting with no effect.
  const isPending = bookingStatus === "PENDING";

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Registreerimise seaded</h2>
        {isPending && (
          <p className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            Võistlus ootab admini kinnitust. Registreerimist saab avada alles
            pärast seda, kui admin on kuupäevabroneeringu kinnitanud.
          </p>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Registreerimise staatus</label>
            <select
              value={regStatus}
              onChange={(e) => setRegStatus(e.target.value)}
              disabled={isPending}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
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
            disabled={isPending}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:bg-amber-200 disabled:text-amber-700 disabled:cursor-not-allowed"
          >
            Salvesta seaded
          </button>
          {isPending && (
            <p className="text-xs text-amber-600">
              Võistlus ootab admini kinnitust
            </p>
          )}
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
