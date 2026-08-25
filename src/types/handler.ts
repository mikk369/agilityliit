// =========================================================================
// Handler types used across pages
// =========================================================================

export interface Handler {
  id: number;
  handlerName: string;
  phone: string;
  email: string;
  clubName: string | null;
  country: string | null;
}

/** Minimal handler info used in tables/lists */
export type HandlerSummary = Pick<Handler, "id" | "handlerName" | "clubName">;

/** Handler info with optional country */
export type HandlerWithCountry = Pick<Handler, "id" | "handlerName" | "clubName" | "country">;
