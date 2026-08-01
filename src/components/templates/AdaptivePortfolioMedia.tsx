"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import {
  classifyPhotoOrientation,
  type PortfolioPhoto,
} from "@/features/media/portfolio-photo";
import type { PortfolioPhotoOrientation } from "@/types/portfolio";

/**
 * Renders public portfolio photos without changing their intrinsic proportions.
 * Input: ordered signed photo URLs. Output: an adaptive hero slideshow or a themed fallback.
 */
export function AdaptivePortfolioHero({
  photos,
  fallbackColor = "#17151c",
}: {
  photos: PortfolioPhoto[];
  fallbackColor?: string;
}) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [detectedOrientations, setDetectedOrientations] = useState<
    Record<string, PortfolioPhotoOrientation>
  >({});
  const activeIndex = photos.length ? activeSlide % photos.length : 0;
  const activePhoto = photos[activeIndex];
  const activeOrientation = activePhoto
    ? activePhoto.orientation === "unknown"
      ? detectedOrientations[activePhoto.id] || "unknown"
      : activePhoto.orientation
    : "unknown";

  useEffect(() => {
    if (
      photos.length < 2 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % photos.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [photos.length]);

  /**
   * Moves the slideshow in either direction and wraps at both ends.
   * Input: previous or next direction. Output: updates the active image index.
   */
  function moveSlide(direction: -1 | 1) {
    setActiveSlide(
      (current) => (current + direction + photos.length) % photos.length
    );
  }

  /**
   * Supplies orientation for legacy media rows that predate persisted dimensions.
   * Input: loaded browser image dimensions. Output: caches orientation for the active photo.
   */
  function detectLegacyOrientation(
    photoId: string,
    width: number,
    height: number
  ) {
    setDetectedOrientations((current) => ({
      ...current,
      [photoId]: classifyPhotoOrientation(width, height),
    }));
  }

  if (!activePhoto) {
    return (
      <div
        className="portfolio-hero-empty"
        style={{ backgroundColor: fallbackColor }}
        aria-label="Portfolio photo has not been added"
      />
    );
  }

  return (
    <div
      className="portfolio-hero-media"
      data-orientation={activeOrientation}
    >
      {/* The ambient layer fills the stage; the sharp image remains fully visible above it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={activePhoto.src}
        alt=""
        aria-hidden="true"
        className="portfolio-hero-ambient"
      />
      <div className="portfolio-hero-photo-frame">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activePhoto.src}
          alt={activePhoto.alt}
          width={activePhoto.width}
          height={activePhoto.height}
          className="portfolio-hero-photo"
          onLoad={(event) => {
            if (activePhoto.orientation === "unknown") {
              detectLegacyOrientation(
                activePhoto.id,
                event.currentTarget.naturalWidth,
                event.currentTarget.naturalHeight
              );
            }
          }}
        />
      </div>

      {photos.length > 1 && (
        <div className="portfolio-hero-controls">
          <button
            type="button"
            onClick={() => moveSlide(-1)}
            aria-label="Show previous photo"
            title="Previous photo"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <span aria-live="polite">
            {activeIndex + 1} / {photos.length}
          </span>
          <button
            type="button"
            onClick={() => moveSlide(1)}
            aria-label="Show next photo"
            title="Next photo"
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Displays gallery photos in orientation-aware spans while preserving every original ratio.
 * Input: public gallery photos. Output: responsive, uncropped gallery markup or null.
 */
export function AdaptivePortfolioGallery({
  photos,
}: {
  photos: PortfolioPhoto[];
}) {
  const [detectedOrientations, setDetectedOrientations] = useState<
    Record<string, PortfolioPhotoOrientation>
  >({});

  if (!photos.length) return null;

  /**
   * Resolves legacy media orientation from natural browser dimensions.
   * Input: photo ID and loaded image dimensions. Output: updates that gallery item's span.
   */
  function detectLegacyOrientation(
    photoId: string,
    width: number,
    height: number
  ) {
    setDetectedOrientations((current) => ({
      ...current,
      [photoId]: classifyPhotoOrientation(width, height),
    }));
  }

  return (
    <section className="portfolio-gallery" aria-labelledby="portfolio-gallery-title">
      <div className="portfolio-section-heading">
        <p>Captured moments</p>
        <h2 id="portfolio-gallery-title">Gallery</h2>
      </div>
      <div className="portfolio-gallery-grid">
        {photos.map((photo) => {
          const orientation =
            photo.orientation === "unknown"
              ? detectedOrientations[photo.id] || "unknown"
              : photo.orientation;

          return (
            <figure
              key={photo.id}
              className="portfolio-gallery-item"
              data-orientation={orientation}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.src}
                alt={photo.alt}
                width={photo.width}
                height={photo.height}
                loading="lazy"
                onLoad={(event) => {
                  if (photo.orientation === "unknown") {
                    detectLegacyOrientation(
                      photo.id,
                      event.currentTarget.naturalWidth,
                      event.currentTarget.naturalHeight
                    );
                  }
                }}
              />
            </figure>
          );
        })}
      </div>
    </section>
  );
}
