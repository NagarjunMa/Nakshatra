import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  classifyPhotoOrientation,
  orderPortfolioPhotos,
  type PortfolioPhoto,
} from "../portfolio-photo";
import type { PortfolioData, PortfolioMedia } from "../../../types/portfolio";

/**
 * Creates temporary full-resolution photo URLs for media the calling Supabase role may read.
 * Input: a Supabase client and visible portfolio media records. Output: ordered slideshow images with signed URLs.
 */
export async function createPortfolioPhotoUrls({
  supabase,
  media,
  viewer = "owner",
  privacyMode = "progressive",
}: {
  supabase: SupabaseClient;
  media: PortfolioMedia[];
  viewer?: "owner" | "public";
  privacyMode?: PortfolioData["privacy_mode"];
}): Promise<PortfolioPhoto[]> {
  const orderedMedia = orderPortfolioPhotos(media);
  let hasClearPrivateGalleryPhoto = false;
  const signedPhotos = await Promise.all(
    orderedMedia.map(async (item): Promise<PortfolioPhoto | null> => {
      const protectedByPhotoSetting =
        viewer === "public" &&
        (item.visibility === "blurred" ||
          item.visibility === "interest_required" ||
          item.visibility === "approved_only");
      const isPrivateGallery =
        viewer === "public" &&
        privacyMode === "private" &&
        item.media_type === "gallery";
      const isClearPrivateGalleryPhoto =
        isPrivateGallery &&
        !protectedByPhotoSetting &&
        item.visibility === "public" &&
        !hasClearPrivateGalleryPhoto;
      if (isClearPrivateGalleryPhoto) hasClearPrivateGalleryPhoto = true;
      const protectedPresentation =
        protectedByPhotoSetting || (isPrivateGallery && !isClearPrivateGalleryPhoto);
      const path = protectedPresentation ? item.metadata?.blurPath : item.storage_path;
      if (!path) return null;
      const { data } = await supabase.storage
        .from("photos")
        .createSignedUrl(path, 60 * 60);

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
        ...(protectedPresentation ? { presentation: "blurred" as const } : {}),
      };
      return photo;
    })
  );

  return signedPhotos.filter((photo): photo is PortfolioPhoto => photo !== null);
}
