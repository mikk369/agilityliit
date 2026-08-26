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
          pathname.startsWith("/calendar") ||
          pathname.startsWith("/competitions") ||
          pathname.startsWith("/results") ||
          pathname.startsWith("/start-protocol") ||
          pathname.startsWith("/teams") ||
          pathname.startsWith("/dog-statistics") ||
          pathname.startsWith("/not-allowed") ||
          pathname.startsWith("/api/auth")
        ) {
          return true;
        }

        // Protected routes — require token
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
