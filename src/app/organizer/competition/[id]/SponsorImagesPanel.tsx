"use client";

import { useState } from "react";
import {
  MAX_SPONSOR_IMAGE_BYTES,
  SPONSOR_IMAGE_SIZES,
  type SponsorImage,
  type SponsorImageSize,
} from "@/lib/sponsor-images";

/**
 * The competition's sponsor logos.
 *
 * Uploading stores the file straight away; attaching it to the competition
 * happens when the list is saved. The two are separate on purpose — an upload
 * the organizer then changes their mind about never reaches a competition.
 */
export function SponsorImagesPanel({
  bookingId,
  initial,
  onMessage,
}: {
  bookingId: string;
  initial: SponsorImage[];
  onMessage: (message: { type: "success" | "error"; text: string }) => void;
}) {
  const [images, setImages] = useState<SponsorImage[]>(initial);
  const [gallery, setGallery] = useState<SponsorImage[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const attachedIds = new Set(images.map((image) => String(image.id)));

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setUploading(true);
    try {
      const body = new FormData();
      for (const file of files) body.append("files", file);

      const res = await fetch("/api/sponsor-images", { method: "POST", body });
      const data = await res.json();

      if (Array.isArray(data.images) && data.images.length > 0) {
        setImages([...images, ...data.images]);
      }
      if (Array.isArray(data.rejected) && data.rejected.length > 0) {
        onMessage({ type: "error", text: data.rejected.join("; ") });
      } else if (!res.ok) {
        onMessage({ type: "error", text: data.error || "Üleslaadimine ebaõnnestus" });
      }
    } catch {
      onMessage({ type: "error", text: "Serveri viga" });
    } finally {
      setUploading(false);
    }
  }

  async function toggleGallery() {
    if (gallery) {
      setGallery(null);
      return;
    }
    try {
      const res = await fetch("/api/sponsor-images");
      setGallery(res.ok ? await res.json() : []);
    } catch {
      setGallery([]);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/competitions/${bookingId}/info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sponsorImages: images }),
      });
      if (res.ok) {
        onMessage({ type: "success", text: "Sponsorite pildid salvestatud!" });
      } else {
        const err = await res.json();
        onMessage({ type: "error", text: err.error || "Salvestamine ebaõnnestus" });
      }
    } catch {
      onMessage({ type: "error", text: "Serveri viga" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Sponsorite pildid</h2>
      <p className="text-sm text-gray-600 mb-4">
        Kuvatakse võistluse avalikul lehel. Maksimaalne faili suurus{" "}
        {MAX_SPONSOR_IMAGE_BYTES / (1024 * 1024)} MB.
      </p>

      {images.length === 0 ? (
        <p className="text-sm text-gray-500 mb-4">Pilte pole veel lisatud.</p>
      ) : (
        <div className="flex flex-wrap gap-4 mb-4">
          {images.map((image) => (
            <div key={String(image.id)} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-center h-24 mb-2">
                {/* Logos are served from this app and, on migrated rows, from
                    the WordPress media library, so a plain img keeps them out
                    of the image optimizer's host allow-list. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt="Sponsor"
                  className="max-h-24 max-w-[160px] object-contain"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={image.size || "M"}
                  onChange={(e) =>
                    setImages(
                      images.map((img) =>
                        String(img.id) === String(image.id)
                          ? { ...img, size: e.target.value as SponsorImageSize }
                          : img
                      )
                    )
                  }
                  className="px-2 py-1 border border-gray-300 rounded-lg text-xs"
                >
                  {SPONSOR_IMAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() =>
                    setImages(images.filter((img) => String(img.id) !== String(image.id)))
                  }
                  className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                >
                  Eemalda
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
          {uploading ? "Laadin üles..." : "Lisa pilte"}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
        <button
          onClick={toggleGallery}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
        >
          {gallery ? "Peida varasemad" : "Vali varasematest"}
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Salvestamine..." : "Salvesta pildid"}
        </button>
      </div>

      {gallery && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Varasemad sponsorite pildid
          </h3>
          {gallery.length === 0 ? (
            <p className="text-sm text-gray-500">Varasemaid pilte pole.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {gallery.map((image) => {
                const attached = attachedIds.has(String(image.id));
                return (
                  <button
                    key={String(image.id)}
                    onClick={() =>
                      !attached && setImages([...images, { ...image, size: image.size || "M" }])
                    }
                    disabled={attached}
                    title={attached ? "Juba lisatud" : "Lisa sellele võistlusele"}
                    className={`border rounded-lg p-2 transition-colors ${
                      attached
                        ? "border-gray-200 opacity-40 cursor-not-allowed"
                        : "border-gray-200 hover:border-blue-400 hover:bg-blue-50"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt="Sponsor"
                      className="h-16 max-w-[120px] object-contain"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
