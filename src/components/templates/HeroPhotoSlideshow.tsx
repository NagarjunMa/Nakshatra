"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import type { PortfolioPhoto } from "@/features/media/portfolio-photo";

/**
 * Displays uploaded portfolio photos as an accessible, reduced-motion-aware hero slideshow.
 * Input: ordered, temporary photo URLs. Output: rotating image markup or null when no photos are available.
 */
export function HeroPhotoSlideshow({ photos }: { photos: PortfolioPhoto[] }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const photoCount = photos.length;
  const activeIndex = photoCount ? activeSlide % photoCount : 0;

  useEffect(() => {
    if (photoCount < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveSlide((current) => ((current % photoCount) + 1) % photoCount);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [photoCount]);

  if (!photoCount) return null;

  const activePhoto = photos[activeIndex] ?? photos[0];

  /**
   * Advances or reverses the selected hero image with circular navigation.
   * Input: previous or next direction. Output: updates the selected slideshow index.
   */
  function moveSlide(direction: -1 | 1) {
    setActiveSlide(
      (current) => ((current % photoCount) + direction + photoCount) % photoCount
    );
  }

  return (
    <div className="absolute inset-0">
      {photos.map((photo, index) => (
        // Signed Supabase URLs are short-lived and intentionally bypass Next's image optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={photo.id}
          src={photo.src}
          alt={index === activeIndex ? photo.alt : ""}
          aria-hidden={index !== activeIndex}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 motion-reduce:transition-none ${
            index === activeIndex ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      {photoCount > 1 && (
        <>
          <button
            type="button"
            onClick={() => moveSlide(-1)}
            className="absolute bottom-4 right-14 z-20 flex h-8 w-8 items-center justify-center border border-white/30 bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/55"
            aria-label="Show previous photo"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => moveSlide(1)}
            className="absolute bottom-4 right-4 z-20 flex h-8 w-8 items-center justify-center border border-white/30 bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/55"
            aria-label="Show next photo"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <p className="sr-only" aria-live="polite">
            {`Showing photo ${activeIndex + 1} of ${photoCount}: ${activePhoto.alt}`}
          </p>
        </>
      )}
    </div>
  );
}
