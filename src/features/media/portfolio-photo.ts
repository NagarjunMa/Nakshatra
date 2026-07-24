import type { PortfolioMedia } from "@/types/portfolio";

export interface PortfolioPhoto {
  id: string;
  src: string;
  alt: string;
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
