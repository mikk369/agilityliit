"use client";

/**
 * The competition's referees (`bookings.referee`).
 *
 * One list, edited when the competition is created and again from its Põhiinfo
 * tab. The names it holds are what the track form and the measurement form
 * offer, so a judge is spelled one way across the whole competition.
 */
export function RefereeList({
  referees,
  onChange,
  keepFirstRow = false,
}: {
  referees: string[];
  onChange: (referees: string[]) => void;
  /** Registration starts with one empty row that cannot be removed. */
  keepFirstRow?: boolean;
}) {
  function update(index: number, value: string) {
    onChange(referees.map((ref, i) => (i === index ? value : ref)));
  }

  return (
    <div className="space-y-2">
      {referees.length === 0 && (
        <p className="text-sm text-gray-500">Kohtunik puudub</p>
      )}
      {referees.map((ref, i) => (
        <div key={i} className="flex gap-2">
          <input
            type="text"
            value={ref}
            onChange={(e) => update(i, e.target.value)}
            placeholder={`Kohtunik ${i + 1}`}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {(!keepFirstRow || referees.length > 1) && (
            <button
              type="button"
              onClick={() => onChange(referees.filter((_, index) => index !== i))}
              className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Eemalda
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...referees, ""])}
        className="text-sm text-blue-600 hover:text-blue-700"
      >
        + Lisa kohtunik
      </button>
    </div>
  );
}

/** The names worth offering in a dropdown: filled in, trimmed, no duplicates. */
export function refereeOptions(referee: unknown): string[] {
  if (!Array.isArray(referee)) return [];
  const names = referee
    .filter((name): name is string => typeof name === "string")
    .map((name) => name.trim())
    .filter(Boolean);
  return [...new Set(names)];
}
