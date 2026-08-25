// =========================================================================
// Dog statistics types (dog-statistics page)
// =========================================================================

export interface StatResult {
  competition_date: string;
  track_type: string;
  competition_type: string;
  organizer: string;
  judge: string;
  breed: string;
  dog_name: string;
  handler_name: string;
  points: number | null;
  faults: number;
  grade: string;
  result: string;
  place: number | null;
}

export interface SearchResponse {
  results: StatResult[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface StatFilters {
  organizer: string;
  breed: string;
  gender: string;
  dog_name: string;
  register_code: string;
  handler_name: string;
  judge: string;
  date_from: string;
  date_to: string;
}

export type AutocompleteField = "dog_name" | "register_code" | "handler_name" | "judge";
