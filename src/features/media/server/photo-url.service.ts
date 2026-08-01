import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  classifyPhotoOrientation,
  orderPortfolioPhotos,
  type PortfolioPhoto,
} from "../portfolio-photo";
import type { PortfolioMedia } from "../../../types/portfolio";

/**
 * Creates temporary full-resolution photo URLs for media the calling Supabase role may read.
 * Input: a Supabase client and visible portfolio media records. Output: ordered slideshow images with signed URLs.
 */
export async function createPortfolioPhotoUrls({
  supabase,
  media,
}: {
  supabase: SupabaseClient;
  media: PortfolioMedia[];
}): Promise<PortfolioPhoto[]> {
  const orderedMedia = orderPortfolioPhotos(media);
  const signedPhotos = await Promise.all(
    orderedMedia.map(async (item): Promise<PortfolioPhoto | null> => {
      const { data } = await supabase.storage
        .from("photos")
        .createSignedUrl(item.storage_path, 60 * 60);

      if (!data?.signedUrl) return null;
      const width = item.metadata?.width;
      const height = item.metadata?.height;
      const photo: PortfolioPhoto = {
        id: item.id,
        src: data.signedUrl,
        alt: item.alt_text || "Portfolio photo",
        mediaType: item.media_type === "hero" ? "hero" : "gallery",
        width,
        height,
        aspectRatio:
          item.metadata?.aspectRatio ||
          (width && height ? width / height : undefined),
        orientation:
          item.metadata?.orientation || classifyPhotoOrientation(width, height),
      };
      return photo;
    })
  );

  return signedPhotos.filter((photo): photo is PortfolioPhoto => photo !== null);
}
