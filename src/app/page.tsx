"use client";

import Link from "next/link";
import { useTranslation } from "@/i18n/LanguageContext";

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
          {t.homeTitle}
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {t.homeSubtitle}
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/competitions"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {t.homeViewCompetitions}
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            {t.homeRegister}
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <FeatureCard
          title={t.homeForCompetitor}
          description={t.homeForCompetitorDesc}
          href="/register"
          linkText={t.homeStartHere}
        />
        <FeatureCard
          title={t.homeForOrganizer}
          description={t.homeForOrganizerDesc}
          href="/login"
          linkText={t.homeLogin}
        />
        <FeatureCard
          title={t.homeResults}
          description={t.homeResultsDesc}
          href="/competitions"
          linkText={t.homeViewResults}
        />
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  href,
  linkText,
}: {
  title: string;
  description: string;
  href: string;
  linkText: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      <Link
        href={href}
        className="text-blue-600 font-medium hover:text-blue-700 transition-colors"
      >
        {linkText} &rarr;
      </Link>
    </div>
  );
}
