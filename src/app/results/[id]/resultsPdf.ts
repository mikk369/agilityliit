import { formatDate, sortResults } from "@/lib/utils";
import type { ResultsBooking, TrackData } from "./types";

export function exportResultsToPDF(booking: ResultsBooking, tracks: TrackData[]) {
  let html = `<h1>Tulemused</h1>
    <h2>${booking.organizerName}</h2>
    <p>${formatDate(booking.startDate)}${booking.startDate !== booking.endDate ? ` – ${formatDate(booking.endDate)}` : ""} | ${booking.location}${booking.clubName ? ` | ${booking.clubName}` : ""} | ${booking.competitionType}</p>`;

  // Group by date
  const dates = getUniqueDates(tracks);
  for (const date of dates) {
    const dateTracks = tracks.filter(
      (t) => new Date(t.track.competitionDate).toISOString().split("T")[0] === date
    );
    if (dates.length > 1) {
      html += `<h3>${formatDate(date)}</h3>`;
    }

    for (const td of dateTracks) {
      const { track, parameters, competitors } = td;
      html += `<h4>${track.letter} - ${track.trackType} | ${track.size} | ${track.competitionType}${track.referee ? ` | Kohtunik: ${track.referee}` : ""}</h4>`;

      if (parameters.length > 0) {
        html += `<table class="params"><thead><tr><th>Grupp</th><th>Pikkus</th><th>Kiirus</th><th>Normiaeg</th><th>Maksimaeg</th></tr></thead><tbody>`;
        for (const p of parameters) {
          html += `<tr><td>${p.sizeGroup}</td><td>${p.trackLength ?? "—"}</td><td>${p.trackSpeed ?? "—"}</td><td>${p.idealTime ?? "—"}</td><td>${p.maxTime ?? "—"}</td></tr>`;
        }
        html += `</tbody></table>`;
      }

      const sorted = sortResults(competitors);

      html += `<table><thead><tr><th>Koht</th><th>Koerajuht</th><th>Koer</th><th>Suurus</th><th>Klass</th><th>Aeg</th><th>Vead</th><th>Puhas</th></tr></thead><tbody>`;
      let place = 0;
      for (const c of sorted) {
        const p = (c.isDns || c.isDsq) ? "" : String(++place);
        const time = c.isDsq ? "DSQ" : c.isDns ? "DNS" : c.timeSeconds !== null ? c.timeSeconds.toFixed(2) : "—";
        html += `<tr>
          <td>${p}</td>
          <td>${c.handler.handlerName}${c.handler.clubName ? ` (${c.handler.clubName})` : ""}</td>
          <td>${c.dog.nickName}</td>
          <td>${c.dog.sizeEst || ""}</td>
          <td>${[c.dog.agilityClass, c.dog.jumpClass].filter(Boolean).join("/")}</td>
          <td>${time}</td>
          <td>${!c.isDsq && !c.isDns ? c.faults : ""}</td>
          <td>${c.hasQualification ? "JAH" : ""}</td>
        </tr>`;
      }
      html += `</tbody></table>`;
    }
  }

  const win = window.open("", "", "height=1000,width=1500");
  if (!win) return;
  win.document.write(`<html><head><title>Tulemused - ${booking.organizerName}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 11px; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      h2 { font-size: 14px; font-weight: normal; margin-top: 0; }
      h3 { font-size: 14px; margin-top: 20px; }
      h4 { font-size: 11px; margin-top: 16px; background: #f5f5f5; padding: 4px 8px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
      table.params { width: auto; margin-bottom: 4px; font-size: 10px; }
      th, td { padding: 3px 6px; text-align: left; border: 1px solid #ddd; }
      th { background: #f9f9f9; font-weight: 600; }
      tr:nth-child(even) { background: #fafafa; }
    </style>
  </head><body>${html}</body></html>`);
  win.document.close();
  win.print();
}

export function getUniqueDates(tracks: TrackData[]): string[] {
  const dateSet = new Set<string>();
  for (const t of tracks) {
    const date = new Date(t.track.competitionDate)
      .toISOString()
      .split("T")[0];
    dateSet.add(date);
  }
  return Array.from(dateSet).sort();
}
