"use client";

import { useState, use } from "react";
import Link from "next/link";

interface Track {
  name: string;
  buildTime: number;
  inspectionTime: number;
  runTime: number;
  xs: number;
  s: number;
  m: number;
  sl: number;
  l: number;
}

interface ScheduleRow {
  time: string;
  activity: string;
  isTotal?: boolean;
  isFooter?: boolean;
}

const emptyTrack: Track = {
  name: "",
  buildTime: 10,
  inspectionTime: 7,
  runTime: 1,
  xs: 0,
  s: 0,
  m: 0,
  sl: 0,
  l: 0,
};

export default function AjakavaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [startTime, setStartTime] = useState("09:00");
  const [tracks, setTracks] = useState<Track[]>([{ ...emptyTrack, name: "Rada 1" }]);
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);

  function addTrack() {
    setTracks([...tracks, { ...emptyTrack, name: `Rada ${tracks.length + 1}` }]);
  }

  function removeTrack(index: number) {
    if (tracks.length <= 1) return;
    setTracks(tracks.filter((_, i) => i !== index));
  }

  function updateTrack(index: number, field: keyof Track, value: string | number) {
    const updated = [...tracks];
    updated[index] = { ...updated[index], [field]: value };
    setTracks(updated);
  }

  function generateSchedule() {
    const rows: ScheduleRow[] = [];
    let totalCompetitors = 0;

    const [hours, minutes] = startTime.split(":").map(Number);
    const current = new Date();
    current.setHours(hours, minutes, 0, 0);

    for (const track of tracks) {
      const competitorsInTrack = track.xs + track.s + track.m + track.sl + track.l;
      totalCompetitors += competitorsInTrack;

      // Build
      rows.push({ time: formatTime(current), activity: `${track.name} - Raja ehitus` });
      current.setMinutes(current.getMinutes() + track.buildTime);

      // Inspection
      rows.push({ time: formatTime(current), activity: `${track.name} - Rajaga tutvumine` });
      current.setMinutes(current.getMinutes() + track.inspectionTime);

      // First dog
      rows.push({ time: formatTime(current), activity: `${track.name} - Esimese koera sooritus algab` });

      // Last dog
      current.setMinutes(current.getMinutes() + competitorsInTrack * track.runTime);
      rows.push({ time: formatTime(current), activity: `${track.name} - Viimase koera sooritus lõpeb` });

      // Track total
      rows.push({ time: "", activity: `Võistlejaid kokku: ${competitorsInTrack}`, isTotal: true });
    }

    rows.push({ time: "", activity: `Kokku ${totalCompetitors} võistlejat`, isFooter: true });

    setSchedule(rows);
  }

  function exportToPDF() {
    const tableHtml = buildTableHtml();
    const win = window.open("", "", "height=1000,width=1500");
    if (!win) return;
    win.document.write(`<html><head><title>Ajakava</title>
      <style>
        body { font-family: Arial, sans-serif; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; text-align: left; border: 1px solid #ccc; }
        tr:nth-child(even) { background-color: #f5f5f5; }
        .total { font-style: italic; color: #666; }
        .footer { font-weight: bold; }
      </style>
    </head><body>${tableHtml}</body></html>`);
    win.document.close();
    win.print();
  }

  async function exportToExcel() {
    const XLSX = await import("xlsx");
    const data = [["Kellaaeg", "Tegevus"]];
    for (const row of schedule) {
      data.push([row.time, row.activity]);
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Ajakava");
    XLSX.writeFile(wb, "Ajakava.xlsx");
  }

  function buildTableHtml() {
    let html = "<table><thead><tr><th>Kellaaeg</th><th>Tegevus</th></tr></thead><tbody>";
    for (const row of schedule) {
      const cls = row.isFooter ? "footer" : row.isTotal ? "total" : "";
      html += `<tr class="${cls}"><td>${row.time}</td><td>${row.activity}</td></tr>`;
    }
    html += "</tbody></table>";
    return html;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Link href={`/organizer/competition/${id}`} className="text-blue-600 hover:text-blue-700 text-sm">
          &larr; Tagasi
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Ajakava generaator</h1>

      {/* Start time */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alguse kellaaeg</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Tracks */}
      <div className="space-y-4 mb-6">
        {tracks.map((track, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Rada {i + 1}</h3>
              {tracks.length > 1 && (
                <button
                  onClick={() => removeTrack(i)}
                  className="text-sm text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                >
                  Eemalda
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="col-span-2 sm:col-span-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Võistlusklass</label>
                <input
                  type="text"
                  value={track.name}
                  onChange={(e) => updateTrack(i, "name", e.target.value)}
                  placeholder="nt. A1 Agility"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ehitusaeg (min)</label>
                <input
                  type="number"
                  value={track.buildTime}
                  onChange={(e) => updateTrack(i, "buildTime", parseInt(e.target.value) || 0)}
                  min={0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tutvumise aeg (min)</label>
                <input
                  type="number"
                  value={track.inspectionTime}
                  onChange={(e) => updateTrack(i, "inspectionTime", parseInt(e.target.value) || 0)}
                  min={0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Soorituse aeg (min)</label>
                <input
                  type="number"
                  value={track.runTime}
                  onChange={(e) => updateTrack(i, "runTime", parseInt(e.target.value) || 0)}
                  min={0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Võistlejate arv suuruste kaupa</label>
              <div className="grid grid-cols-5 gap-2">
                {(["xs", "s", "m", "sl", "l"] as const).map((size) => (
                  <div key={size}>
                    <label className="block text-xs text-center text-gray-500 mb-1">{size.toUpperCase()}</label>
                    <input
                      type="number"
                      value={track[size]}
                      onChange={(e) => updateTrack(i, size, parseInt(e.target.value) || 0)}
                      min={0}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1 text-right">
                Kokku: {track.xs + track.s + track.m + track.sl + track.l} võistlejat
              </p>
            </div>
          </div>
        ))}

        <button
          onClick={addTrack}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          + Lisa rada
        </button>
      </div>

      {/* Generate button */}
      <div className="mb-8">
        <button
          onClick={generateSchedule}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Genereeri ajakava
        </button>
      </div>

      {/* Schedule table */}
      {schedule.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Ajakava</h2>
            <div className="flex gap-2">
              <button
                onClick={exportToPDF}
                className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                PDF
              </button>
              <button
                onClick={exportToExcel}
                className="px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              >
                Excel
              </button>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="px-4 py-2 font-medium text-gray-600 w-32">Kellaaeg</th>
                <th className="px-4 py-2 font-medium text-gray-600">Tegevus</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b border-gray-50 ${
                    row.isFooter
                      ? "bg-gray-100 font-bold"
                      : row.isTotal
                      ? "bg-gray-50 italic text-gray-500"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <td className="px-4 py-2">{row.time}</td>
                  <td className="px-4 py-2">{row.activity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("et-EE", { hour: "2-digit", minute: "2-digit" });
}
