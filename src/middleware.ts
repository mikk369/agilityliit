import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Organizer routes — require ORGANIZER or ADMIN
    if (pathname.startsWith("/organizer")) {
      if (token?.role !== "ORGANIZER" && token?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/not-allowed", req.url));
      }
    }

    // Competitor routes — require COMPETITOR (or ADMIN)
    if (pathname.startsWith("/competitor")) {
      if (
        token?.role !== "COMPETITOR" &&
        token?.role !== "ADMIN"
      ) {
        return NextResponse.redirect(new URL("/not-allowed", req.url));
      }
    }

    // Admin routes
    if (pathname.startsWith("/admin")) {
      if (token?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/not-allowed", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;

        // Public routes — always allow
        if (
          pathname === "/" ||
          pathname.startsWith("/login") ||
          pathname.startsWith("/register") ||
          pathname.startsWith("/forgot-password") ||
          pathname.startsWith("/reset-password") ||
          pathname.startsWith("/competitions") ||
          pathname.startsWith("/results") ||
          pathname.startsWith("/start-protocol") ||
          pathname.startsWith("/teams") ||
          pathname.startsWith("/dog-statistics") ||
          pathname.startsWith("/not-allowed") ||
          pathname.startsWith("/api/auth") ||
          // Public feed read by the WordPress calendar on agilityliit.ee
          pathname.startsWith("/api/public") ||
          // A stored sponsor logo, published on the competition page. Only the
          // files: the collection route above it uploads and lists, and checks
          // the session itself.
          pathname.startsWith("/api/sponsor-images/")
        ) {
          return true;
        }

        // Protected routes — require a token that has not been revoked
        return !!token && !token.revoked;
      },
    },
  }
);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
