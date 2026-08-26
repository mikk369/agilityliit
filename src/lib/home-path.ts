/** The federation's WordPress site — the public front page this app sits under. */
export const WP_SITE_URL = "https://agilityliit.ee";

/**
 * Where a user belongs when they hit the app root.
 * The public landing page lives on agilityliit.ee — this app has no front page,
 * so "/" only routes people onward based on their role.
 */
export function homePathForRole(role?: string | null): string {
  switch (role) {
    case "ADMIN":
    case "ORGANIZER":
      return "/organizer";
    case "COMPETITOR":
      return "/competitor";
    default:
      return "/competitions";
  }
}
