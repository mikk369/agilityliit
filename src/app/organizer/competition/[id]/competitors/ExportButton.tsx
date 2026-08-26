"use client";

import type { CompetitorEntry } from "@/types";

export function ExportButton({
  bookingName,
  competitors,
}: {
  bookingName: string;
  competitors: CompetitorEntry[];
}) {
  return (
    <button
      onClick={() => exportCompetitorsToExcel(bookingName, competitors)}
      className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
    >
      Excel
    </button>
  );
}

async function exportCompetitorsToExcel(bookingName: string, competitors: CompetitorEntry[]) {
  const XLSX = await import("xlsx");
  const data = [["Koerajuht", "Klubi", "Riik", "Koer", "Tõug", "Suurus (EST)", "Agility", "Jumping", "Rajad", "Staatus", "Märkused"]];

  for (const c of competitors) {
    const tracks = c.competitorTracks
      .map((ct) => `${ct.competitionTrack.letter} (${ct.competitionTrack.trackType})`)
      .join(", ");
    data.push([
      c.handler.handlerName,
      c.handler.clubName || "",
      c.handler.country || "",
      c.dog.nickName,
      c.dog.breed || "",
      c.dog.sizeEst || "",
      c.dog.agilityClass || "",
      c.dog.jumpClass || "",
      tracks,
      c.status === "ACCEPTED" ? "Kinnitatud" : "Ootel",
      c.remarks || "",
    ]);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Võistlejad");
  XLSX.writeFile(wb, `Voistlejad_${bookingName}.xlsx`);
}
