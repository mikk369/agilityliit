"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export default function NavBar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  const role = session?.user?.role;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link
              href="/"
              className="text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Agility Liit
            </Link>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink href="/competitions">Võistlused</NavLink>

            {role === "ORGANIZER" || role === "ADMIN" ? (
              <>
                <NavLink href="/organizer">Korraldaja</NavLink>
              </>
            ) : null}

            {role === "COMPETITOR" ? (
              <>
                <NavLink href="/competitor">Minu leht</NavLink>
              </>
            ) : null}

            {role === "ADMIN" && (
              <NavLink href="/admin">Admin</NavLink>
            )}

            <div className="ml-4 flex items-center gap-2">
              {session ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">
                    {session.user.name}
                  </span>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="text-sm px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    Logi välja
                  </button>
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-sm px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Logi sisse
                  </Link>
                  <Link
                    href="/register"
                    className="text-sm px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    Registreeru
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
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
            <MobileLink href="/competitions" onClick={() => setMenuOpen(false)}>
              Võistlused
            </MobileLink>

            {(role === "ORGANIZER" || role === "ADMIN") && (
              <MobileLink href="/organizer" onClick={() => setMenuOpen(false)}>
                Korraldaja
              </MobileLink>
            )}

            {role === "COMPETITOR" && (
              <MobileLink href="/competitor" onClick={() => setMenuOpen(false)}>
                Minu leht
              </MobileLink>
            )}

            {role === "ADMIN" && (
              <MobileLink href="/admin" onClick={() => setMenuOpen(false)}>
                Admin
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
                      signOut({ callbackUrl: "/" });
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
                  >
                    Logi välja
                  </button>
                </>
              ) : (
                <>
                  <MobileLink href="/login" onClick={() => setMenuOpen(false)}>
                    Logi sisse
                  </MobileLink>
                  <MobileLink
                    href="/register"
                    onClick={() => setMenuOpen(false)}
                  >
                    Registreeru
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
