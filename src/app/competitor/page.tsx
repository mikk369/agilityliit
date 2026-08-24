"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

export default function CompetitorDashboard() {
  const { data: session } = useSession();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Minu leht</h1>
      <p className="text-gray-600 mb-8">
        Tere, {session?.user?.name}! Siit saad hallata oma andmeid ja
        registreeruda võistlustele.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <DashboardCard
          href="/competitor/profile"
          title="Minu andmed"
          description="Lisa või muuda oma koerajuhi andmeid."
        />
        <DashboardCard
          href="/competitor/dogs"
          title="Minu koerad"
          description="Halda oma koerte andmeid ja vaktsineerimisi."
        />
        <DashboardCard
          href="/competitor/competitions"
          title="Minu võistlused"
          description="Vaata oma registreeringuid ja tulevasi võistlusi."
        />
        <DashboardCard
          href="/competitor/results"
          title="Tulemused"
          description="Vaata oma koerte tulemusi ja statistikat."
        />
        <DashboardCard
          href="/competitions"
          title="Võistlused"
          description="Sirvi ja registreeru avatud võistlustele."
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
