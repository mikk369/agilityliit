import type { CompetitionTrack } from "@/types";

export interface PublicResultHandler {
  id?: number;
  handlerName: string;
  clubName: string | null;
  country?: string | null;
}

export interface PublicResultDog {
  id?: number;
  nickName: string;
  sizeEst: string | null;
  sizeFci?: string | null;
  agilityClass: string | null;
  jumpClass: string | null;
  breed: string | null;
}

export interface PublicCompetitorResult {
  competitorId: number;
  handler: PublicResultHandler;
  dog: PublicResultDog;
  timeSeconds: number | null;
  faults: number;
  isDsq: boolean;
  isDns: boolean;
  hasQualification: boolean;
  notes: string | null;
}

export interface TrackParameter {
  id?: number;
  sizeGroup: string;
  trackLength: number | null;
  trackSpeed: number | null;
  idealTime: number | null;
  maxTime: number | null;
}

export interface TrackData {
  track: CompetitionTrack;
  parameters: TrackParameter[];
  competitors: PublicCompetitorResult[];
}

export interface ResultsBooking {
  id: number;
  organizerName: string;
  clubName: string;
  location: string;
  startDate: string;
  endDate: string;
  competitionOfficiality: string;
  protocolPublished: number;
}

export interface ResultsResponse {
  booking: ResultsBooking;
  tracks: TrackData[];
}
