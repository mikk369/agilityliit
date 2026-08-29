import { z } from "zod";

// =========================================================================
// AUTH
// =========================================================================

export const loginSchema = z.object({
  email: z.string().email("Palun sisesta korrektne e-posti aadress"),
  password: z.string().min(6, "Parool peab olema vähemalt 6 tähemärki"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Nimi peab olema vähemalt 2 tähemärki"),
    email: z.string().email("Palun sisesta korrektne e-posti aadress"),
    password: z.string().min(6, "Parool peab olema vähemalt 6 tähemärki"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Paroolid ei kattu",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// =========================================================================
// BOOKINGS
// =========================================================================

export const bookingSchema = z.object({
  startDate: z.string().min(1, "Alguskuupäev on kohustuslik"),
  endDate: z.string().min(1, "Lõppkuupäev on kohustuslik"),
  qualTime: z.string().optional(),
  organizerName: z.string().min(1, "Korraldaja nimi on kohustuslik"),
  clubName: z.string().min(1, "Klubi nimi on kohustuslik"),
  email: z.string().email("Palun sisesta korrektne e-posti aadress"),
  phone: z.string().min(1, "Telefon on kohustuslik"),
  location: z.string().min(1, "Asukoht on kohustuslik"),
  referee: z.array(z.string()).optional(),
  info: z.string().optional(),
  competitionClasses: z.string().optional(),
  competitionOfficiality: z.string().min(1, "Võistlustüüp on kohustuslik"),
  status: z.enum(["PENDING", "BOOKED", "CLUBEVENT"]).optional(),
  regStatus: z.string().optional(),
  regCloseDate: z.string().optional(),
});

export const bookingUpdateSchema = bookingSchema.partial();

export type BookingInput = z.infer<typeof bookingSchema>;

// =========================================================================
// HANDLERS
// =========================================================================

export const handlerSchema = z.object({
  handlerName: z.string().min(2, "Nimi peab olema vähemalt 2 tähemärki"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  clubName: z.string().optional(),
  country: z.string().optional(),
});

export const handlerUpdateSchema = handlerSchema.partial();

export type HandlerInput = z.infer<typeof handlerSchema>;

// =========================================================================
// DOGS
// =========================================================================

export const dogSchema = z.object({
  nickName: z.string().min(1, "Koera kutsumanimi on kohustuslik"),
  officialName: z.string().optional(),
  breed: z.string().optional(),
  gender: z.string().optional(),
  birthday: z.string().optional(),
  sizeEst: z.string().optional(),
  sizeFci: z.string().optional(),
  agilityClass: z.string().optional(),
  jumpClass: z.string().optional(),
  registerCode: z.string().optional(),
  idCode: z.string().optional(),
  generalVaccinationEnd: z.string().optional(),
  rabiesVaccinationEnd: z.string().optional(),
  ownersName: z.string().optional(),
  info: z.string().optional(),
});

export const dogUpdateSchema = dogSchema.partial();

export type DogInput = z.infer<typeof dogSchema>;

// =========================================================================
// COMPETITORS (registration for a competition)
// =========================================================================

export const competitorSchema = z.object({
  bookingId: z.number().int().positive(),
  dogId: z.number().int().positive(),
  remarks: z.string().optional(),
  needsMeasurement: z.boolean().optional(),
  needsCompetitionBook: z.boolean().optional(),
  trackIds: z.array(z.number().int().positive()).optional(),
  competitionDate: z.string().optional(),
  sizeStandard: z.string().optional(),
});

export const competitorTracksSchema = z.object({
  trackIds: z.array(z.number().int().positive()).min(1, "Vali vähemalt üks rada"),
  sizeStandard: z.enum(["EST", "FCI"]).optional(),
});

export const competitorInfoSchema = z.object({
  remarks: z.string().max(1000).optional(),
});

export type CompetitorInput = z.infer<typeof competitorSchema>;

// =========================================================================
// COMPETITION INFO
// =========================================================================

/**
 * Every field is optional and the route writes only what it is sent, so a
 * caller saving one panel of the info page cannot blank the others. An
 * explicit `null` is the way to clear a field; leaving it out keeps it.
 */
export const competitionInfoSchema = z.object({
  descriptionEst: z.string().nullable().optional(),
  descriptionEng: z.string().nullable().optional(),
  sponsorImages: z.array(z.object({
    id: z.string(),
    url: z.string(),
    size: z.number().optional(),
  })).nullable().optional(),
  maxCompetitorsPerDay: z.record(z.string(), z.number()).nullable().optional(),
});

export type CompetitionInfoInput = z.infer<typeof competitionInfoSchema>;

// =========================================================================
// COMPETITION TRACKS
// =========================================================================

export const competitionTrackSchema = z.object({
  competitionDate: z.string().min(1, "Kuupäev on kohustuslik"),
  letter: z.string().min(1, "Raja täht on kohustuslik"),
  trackType: z.string().min(1, "Võistlusklass on kohustuslik"),
  size: z.string().min(1, "Suurusrühm on kohustuslik"),
  officiality: z.string().min(1, "Võistlustüüp on kohustuslik"),
  referee: z.string().optional(),
  sizeStandard: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isRelay: z.boolean().optional(),
});

export type CompetitionTrackInput = z.infer<typeof competitionTrackSchema>;

// =========================================================================
// TRACK PARAMETERS (track_results)
// =========================================================================

export const trackParameterSchema = z.object({
  sizeGroup: z.string().min(1, "Suurusgrupp on kohustuslik"),
  trackLength: z.number().nullable().optional(),
  trackSpeed: z.number().nullable().optional(),
  idealTime: z.number().nullable().optional(),
  maxTime: z.number().nullable().optional(),
});

export type TrackParameterInput = z.infer<typeof trackParameterSchema>;

// =========================================================================
// COMPETITOR RESULTS
// =========================================================================

export const competitorResultSchema = z.object({
  competitorId: z.number().int().positive(),
  competitionTrackId: z.number().int().positive(),
  timeSeconds: z.number().nullable().optional(),
  faults: z.number().int().default(0),
  isDsq: z.boolean().default(false),
  isDns: z.boolean().default(false),
  hasQualification: z.boolean().default(false),
});

export type CompetitorResultInput = z.infer<typeof competitorResultSchema>;

// =========================================================================
// START PROTOCOL
// =========================================================================

export const startProtocolEntrySchema = z.object({
  competitorId: z.number().int().positive(),
  competitionTrackId: z.number().int().positive(),
  competitionDate: z.string().min(1),
  size: z.string().min(1),
  startNumber: z.number().int().default(0),
  sortOrder: z.number().int().default(0),
});

export type StartProtocolEntryInput = z.infer<typeof startProtocolEntrySchema>;

// =========================================================================
// TEAMS
// =========================================================================

export const teamSchema = z.object({
  competitionDate: z.string().min(1),
  size: z.string().min(1),
  trackType: z.string().optional(),
  teamName: z.string().default(""),
  sortOrder: z.number().int().default(0),
  members: z.array(z.number().int().positive()).min(3).max(4),
});

export type TeamInput = z.infer<typeof teamSchema>;

// =========================================================================
// TEAM RESULTS
// =========================================================================

export const teamResultSchema = z.object({
  teamId: z.number().int().positive(),
  competitionTrackId: z.number().int().positive(),
  timeSeconds: z.number().nullable().optional(),
  faults: z.number().int().default(0),
  isDsq: z.boolean().default(false),
  isDns: z.boolean().default(false),
  notes: z.string().optional(),
});

export type TeamResultInput = z.infer<typeof teamResultSchema>;

// =========================================================================
// AWARDINGS
// =========================================================================

export const awardingSchema = z.object({
  name: z.string().min(1, "Nimi on kohustuslik"),
  sortOrder: z.number().int().default(0),
  tracks: z.array(z.object({
    letter: z.string().min(1),
    trackType: z.string().min(1),
    competitionDate: z.string().min(1),
  })).min(1, "Vähemalt üks rada on kohustuslik"),
});

export type AwardingInput = z.infer<typeof awardingSchema>;

// =========================================================================
// DOG MEASUREMENTS
// =========================================================================

export const dogMeasurementSchema = z.object({
  dogId: z.number().int().positive(),
  bookingId: z.number().int().positive(),
  referee: z.string().min(1, "Kohtunik on kohustuslik"),
  // The class is derived from the measured height server-side, never sent by the client.
  measurementCm: z.coerce
    .number()
    .min(10, "Mõõtmistulemus peab olema vahemikus 10-100 cm")
    .max(100, "Mõõtmistulemus peab olema vahemikus 10-100 cm"),
});

export type DogMeasurementInput = z.infer<typeof dogMeasurementSchema>;
