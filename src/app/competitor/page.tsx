"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useTranslation } from "@/i18n/LanguageContext";

export default function CompetitorDashboard() {
  const { data: session } = useSession();
  const { t } = useTranslation();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.dashTitle}</h1>
      <p className="text-gray-600 mb-8">
        {t.dashGreeting(session?.user?.name || "")}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <DashboardCard
          href="/competitor/profile"
          title={t.dashProfile}
          description={t.dashProfileDesc}
        />
        <DashboardCard
          href="/competitor/dogs"
          title={t.dashDogs}
          description={t.dashDogsDesc}
        />
        <DashboardCard
          href="/competitor/competitions"
          title={t.dashCompetitions}
          description={t.dashCompetitionsDesc}
        />
        <DashboardCard
          href="/competitor/results"
          title={t.dashResults}
          description={t.dashResultsDesc}
        />
        <DashboardCard
          href="/competitions"
          title={t.dashBrowse}
          description={t.dashBrowseDesc}
        />
      </div>
    </div>
  );
}

function DashboardCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md hover:border-blue-200 transition-all"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </Link>
  );
}
