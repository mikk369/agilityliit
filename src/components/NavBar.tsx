"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { useTranslation } from "@/i18n/LanguageContext";
import LangToggle from "./LangToggle";
import { homePathForRole } from "@/lib/home-path";

export default function NavBar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useTranslation();

  const role = session?.user?.role;
  const homeHref = session ? homePathForRole(role) : "/calendar";

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link
              href={homeHref}
              className="text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              {t.navLogo}
            </Link>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink href="/calendar">{t.navCalendar}</NavLink>
            <NavLink href="/competitions">{t.navCompetitions}</NavLink>
            <NavLink href="/dog-statistics">{t.navStatistics}</NavLink>

            {role === "ORGANIZER" || role === "ADMIN" ? (
              <>
                <NavLink href="/organizer">{t.navOrganizer}</NavLink>
              </>
            ) : null}

            {role === "COMPETITOR" ? (
              <>
                <NavLink href="/competitor">{t.navMyPage}</NavLink>
              </>
            ) : null}

            {role === "ADMIN" && (
              <NavLink href="/admin">{t.navAdmin}</NavLink>
            )}

            <div className="ml-4 flex items-center gap-3">
              <LangToggle />
              {session ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">
                    {session.user.name}
                  </span>
                  <button
                    onClick={() => signOut({ callbackUrl: "/calendar" })}
                    className="text-sm px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    {t.navLogout}
                  </button>
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-sm px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    {t.navLogin}
                  </Link>
                  <Link
                    href="/register"
                    className="text-sm px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    {t.navRegister}
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <LangToggle />
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {menuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 space-y-1">
            <MobileLink href="/calendar" onClick={() => setMenuOpen(false)}>
              {t.navCalendar}
            </MobileLink>
            <MobileLink href="/competitions" onClick={() => setMenuOpen(false)}>
              {t.navCompetitions}
            </MobileLink>
            <MobileLink href="/dog-statistics" onClick={() => setMenuOpen(false)}>
              {t.navStatistics}
            </MobileLink>

            {(role === "ORGANIZER" || role === "ADMIN") && (
              <MobileLink href="/organizer" onClick={() => setMenuOpen(false)}>
                {t.navOrganizer}
              </MobileLink>
            )}

            {role === "COMPETITOR" && (
              <MobileLink href="/competitor" onClick={() => setMenuOpen(false)}>
                {t.navMyPage}
              </MobileLink>
            )}

            {role === "ADMIN" && (
              <MobileLink href="/admin" onClick={() => setMenuOpen(false)}>
                {t.navAdmin}
              </MobileLink>
            )}

            <div className="pt-2 border-t border-gray-100">
              {session ? (
                <>
                  <p className="px-3 py-2 text-sm text-gray-500">
                    {session.user.name}
                  </p>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      signOut({ callbackUrl: "/calendar" });
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
                  >
                    {t.navLogout}
                  </button>
                </>
              ) : (
                <>
                  <MobileLink href="/login" onClick={() => setMenuOpen(false)}>
                    {t.navLogin}
                  </MobileLink>
                  <MobileLink
                    href="/register"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t.navRegister}
                  </MobileLink>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
    >
      {children}
    </Link>
  );
}

function MobileLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
    >
      {children}
    </Link>
  );
}
