"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageBanner } from "@/components/ui/MessageBanner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      // The endpoint answers the same way for a known and an unknown address,
      // so there is nothing here that reveals whether the account exists.
      setSent(true);
      setMessage({ type: "success", text: data.message });
    } catch {
      setMessage({ type: "error", text: "Saatmine ebaõnnestus. Proovi uuesti." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Unustasid parooli?
          </h1>
          <p className="text-sm text-gray-500 text-center mb-8">
            Sisesta oma e-posti aadress ja saadame sulle uue parooli määramise lingi.
          </p>

          <MessageBanner message={message} />

          {!sent && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  E-post
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="minu@email.ee"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "Saadan..." : "Saada link"}
              </button>
            </form>
          )}

          <p className="text-sm text-gray-500 text-center mt-6">
            <Link href="/login" className="text-blue-600 hover:text-blue-700">
              Tagasi sisselogimisele
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
