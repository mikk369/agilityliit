import Link from "next/link";

export default function NotAllowedPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-300 mb-4">403</h1>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Ligipääs keelatud
        </h2>
        <p className="text-gray-600 mb-6">
          Teil puudub õigus selle lehe vaatamiseks.
        </p>
        <Link
          href="/"
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Tagasi avalehele
        </Link>
      </div>
    </div>
  );
}
