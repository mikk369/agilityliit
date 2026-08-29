"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useTranslation } from "@/i18n/LanguageContext";
import { formatDate } from "@/lib/utils";
import {
  VACCINATION_WARNING_DAYS,
  dogsNeedingVaccination,
  type DogVaccinationAlerts,
} from "@/lib/vaccination";
import type { Dog } from "@/types";

const SEEN_KEY_PREFIX = "vaccWarningSeen:";

/**
 * Forget that the warning has been shown, so the next login gets it again.
 * Called on sign-out: sessionStorage outlives a logout within the same tab,
 * which would otherwise swallow the warning for the next person to log in.
 */
export function clearVaccinationWarningSeen() {
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(SEEN_KEY_PREFIX)) sessionStorage.removeItem(key);
  }
}

/**
 * Warns a competitor about vaccinations that have expired or are about to,
 * once per browser session — so it greets them after logging in without
 * reappearing on every page they open afterwards. Cleared on sign-out, so the
 * next login is warned again.
 */
export default function VaccinationWarningModal() {
  const { data: session, status } = useSession();
  const { locale, t } = useTranslation();
  const [dogs, setDogs] = useState<DogVaccinationAlerts[]>([]);
  const [open, setOpen] = useState(false);

  const userId = session?.user?.id;
  const isCompetitor = session?.user?.role === "COMPETITOR";

  useEffect(() => {
    if (status !== "authenticated" || !isCompetitor || !userId) return;

    const seenKey = `${SEEN_KEY_PREFIX}${userId}`;
    if (sessionStorage.getItem(seenKey)) return;

    let cancelled = false;
    fetch("/api/dogs/me")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: Dog[]) => {
        if (cancelled) return;
        const needing = dogsNeedingVaccination(data);
        if (needing.length === 0) return;
        setDogs(needing);
        setOpen(true);
        sessionStorage.setItem(seenKey, "1");
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [status, isCompetitor, userId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[85vh] overflow-y-auto p-6">
        <h2 className="text-lg font-bold text-blue-700 text-center mb-2">
          {t.vaccWarningTitle}
        </h2>
        <p className="text-sm text-gray-600 text-center mb-5">
          {t.vaccWarningIntro(VACCINATION_WARNING_DAYS)}
        </p>

        <div className="space-y-3">
          {dogs.map((dog) => (
            <div
              key={dog.dogId}
              className="border border-gray-200 rounded-lg p-3 bg-gray-50"
            >
              <p className="font-semibold text-gray-900 mb-1">{dog.nickName}</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                {dog.alerts.map((alert) => (
                  <li key={alert.kind}>
                    {alert.kind === "general"
                      ? t.dogsGeneralVacc
                      : t.dogsRabiesVacc}
                    :{" "}
                    <span
                      className={`font-semibold ${
                        alert.status === "expired"
                          ? "text-red-600"
                          : "text-blue-700"
                      }`}
                    >
                      {alert.status === "expired"
                        ? t.vaccWarningExpiredOn(formatDate(alert.date, locale))
                        : t.vaccWarningExpiresOn(formatDate(alert.date, locale))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/competitor/dogs"
            onClick={() => setOpen(false)}
            className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium text-center hover:bg-blue-700 transition-colors"
          >
            {t.vaccWarningGoToDogs}
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="w-full py-2.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}
