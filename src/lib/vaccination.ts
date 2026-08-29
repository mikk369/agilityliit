// =========================================================================
// VACCINATION VALIDITY
// =========================================================================

/**
 * How many days before expiry the login warning starts nagging.
 *
 * Deliberately shorter than the dog card's own "expiring soon" badge: the
 * badge is passive colour on a page the competitor chose to open, this one
 * interrupts them, so it only fires once the deadline is actually near.
 */
export const VACCINATION_WARNING_DAYS = 5;

export type VaccinationStatus = "missing" | "expired" | "expiring" | "valid";

/** Where a vaccination end date sits relative to today. */
export function vaccinationStatus(
  date: string | null,
  withinDays: number
): VaccinationStatus {
  if (!date) return "missing";
  const end = new Date(date);
  if (Number.isNaN(end.getTime())) return "missing";

  const now = new Date();
  if (end < now) return "expired";

  const limit = new Date(now);
  limit.setDate(limit.getDate() + withinDays);
  return end < limit ? "expiring" : "valid";
}

/** One dog's vaccination that needs the handler's attention. */
export interface VaccinationAlert {
  kind: "general" | "rabies";
  status: "expired" | "expiring";
  date: string;
}

export interface DogVaccinationAlerts {
  dogId: number;
  nickName: string;
  alerts: VaccinationAlert[];
}

type VaccinatedDog = {
  id: number;
  nickName: string;
  generalVaccinationEnd: string | null;
  rabiesVaccinationEnd: string | null;
};

/**
 * Dogs whose vaccinations have run out or are about to, in the order given.
 * Dogs with no date on record are left out — they have nothing to expire, and
 * the dogs page already flags them as missing.
 */
export function dogsNeedingVaccination(
  dogs: VaccinatedDog[],
  withinDays: number = VACCINATION_WARNING_DAYS
): DogVaccinationAlerts[] {
  return dogs
    .map((dog) => {
      const alerts: VaccinationAlert[] = [];
      const pairs = [
        { kind: "general" as const, date: dog.generalVaccinationEnd },
        { kind: "rabies" as const, date: dog.rabiesVaccinationEnd },
      ];
      for (const { kind, date } of pairs) {
        const status = vaccinationStatus(date, withinDays);
        if ((status === "expired" || status === "expiring") && date) {
          alerts.push({ kind, status, date });
        }
      }
      return { dogId: dog.id, nickName: dog.nickName, alerts };
    })
    .filter((dog) => dog.alerts.length > 0);
}
