// =========================================================================
// Team types used across pages
// =========================================================================

export interface TeamMember {
  id: number;
  competitorId: number;
  sortOrder: number;
  competitor: {
    id: number;
    handler: { handlerName: string; clubName: string | null };
    dog: { nickName: string; sizeEst: string | null; breed: string | null };
  };
}

export interface Team {
  id?: number;
  competitionDate: string;
  size: string;
  trackType: string | null;
  teamName: string;
  sortOrder: number;
  members: TeamMember[];
}

export interface TeamsResponse {
  teamsLocked: number;
  teamsPublished: number;
  teams: Team[];
}
