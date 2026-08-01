import type {
  PortfolioMedia,
  PortfolioPhotoOrientation,
} from "@/types/portfolio";

export interface PortfolioPhoto {
  id: string;
  src: string;
  alt: string;
  mediaType: "hero" | "gallery";
  width?: number;
  height?: number;
  aspectRatio?: number;
  orientation: PortfolioPhotoOrientation;
}

/**
 * Classifies an image using its post-rotation dimensions while tolerating near-square photos.
 * Input: optional positive width and height. Output: portrait, landscape, square, or unknown.
 */
export function classifyPhotoOrientation(
  width?: number,
  height?: number
): PortfolioPhotoOrientation {
  if (!width || !height || width <= 0 || height <= 0) return "unknown";
  const aspectRatio = width / height;
  if (aspectRatio < 0.9) return "portrait";
  if (aspectRatio > 1.1) return "landscape";
  return "square";
}

/**
 * Orders portfolio images with the selected hero first and preserves gallery order afterwards.
 * Input: portfolio media records. Output: a new, display-ready list without mutating the source array.
 */
export function orderPortfolioPhotos(media: PortfolioMedia[]) {
  return [...media].sort((left, right) => {
    const leftRank = left.media_type === "hero" ? 0 : 1;
    const rightRank = right.media_type === "hero" ? 0 : 1;
    return leftRank - rightRank || left.sort_order - right.sort_order;
  });
}
