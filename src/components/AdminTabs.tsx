"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/bookings", label: "Broneeringud" },
  { href: "/admin/users", label: "Kasutajad" },
];

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 mb-6 border-b border-gray-200">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm -mb-px border-b-2 transition-colors ${
              active
                ? "border-blue-600 text-blue-600 font-medium"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
