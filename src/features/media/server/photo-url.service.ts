import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { orderPortfolioPhotos, type PortfolioPhoto } from "../portfolio-photo";
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
    orderedMedia.map(async (item) => {
      const { data } = await supabase.storage
        .from("photos")
        .createSignedUrl(item.storage_path, 60 * 60);

      if (!data?.signedUrl) return null;
      return {
        id: item.id,
        src: data.signedUrl,
        alt: item.alt_text || "Portfolio photo",
      } satisfies PortfolioPhoto;
    })
  );

  return signedPhotos.filter((photo): photo is PortfolioPhoto => photo !== null);
}
