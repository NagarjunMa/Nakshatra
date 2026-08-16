import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { classifyPhotoOrientation, type PortfolioPhoto } from "@/features/media/portfolio-photo";
import {
  approvedHoroscopeSchema,
  resolvedPortfolioSchema,
  type ApprovedHoroscope,
  type PublicMediaDescriptor,
  type ResolvedPortfolio,
} from "./public-portfolio.contract";
import { PublicPortfolioRepository } from "./public-portfolio.repository";

export interface PortfolioView extends ResolvedPortfolio {
  accessMode: "public" | "approved";
  photos: PortfolioPhoto[];
}

/** Resolves one exact public token without exposing direct table reads to the caller. */
export async function resolvePublicPortfolio(
  supabase: SupabaseClient,
  token: string
): Promise<ResolvedPortfolio | null> {
  const repository = new PublicPortfolioRepository(supabase);
  const { data, error } = await repository.resolvePublic(token);
  if (error || !data) return null;
  const parsed = resolvedPortfolioSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/** Resolves an approved projection only when the authenticated viewer has an active full grant. */
export async function resolvePortfolioView(
  supabase: SupabaseClient,
  token: string,
  authenticated: boolean
): Promise<PortfolioView | null> {
  const repository = new PublicPortfolioRepository(supabase);
  const publicPortfolio = await resolvePublicPortfolio(supabase, token);
  if (!publicPortfolio) return null;

  let resolved = publicPortfolio;
  let accessMode: PortfolioView["accessMode"] = "public";
  if (authenticated) {
    const { data } = await repository.resolveApproved(token);
    const approved = resolvedPortfolioSchema.safeParse(data);
    if (approved.success) {
      resolved = approved.data;
      accessMode = "approved";
    }
  }

  return {
    ...resolved,
    accessMode,
    photos: await createSafePhotoUrls(repository, resolved.media),
  };
}

/** Records a view using only the share token; unavailable tokens are ignored uniformly. */
export async function recordPublicPortfolioView(
  supabase: SupabaseClient,
  token: string
) {
  const repository = new PublicPortfolioRepository(supabase);
  await repository.recordView(token);
}

/** Resolves and signs an approved horoscope for five minutes. */
export async function resolveApprovedHoroscope(
  supabase: SupabaseClient,
  token: string
): Promise<(ApprovedHoroscope & { signedUrl: string }) | null> {
  const repository = new PublicPortfolioRepository(supabase);
  const { data, error } = await repository.resolveApprovedHoroscope(token);
  if (error || !data) return null;
  const parsed = approvedHoroscopeSchema.safeParse(data);
  if (!parsed.success) return null;
  const isWord = parsed.data.fileExtension === "doc" || parsed.data.fileExtension === "docx";
  const signed = await repository.createHoroscopeUrl(
    parsed.data.accessPath,
    5 * 60,
    isWord ? `horoscope.${parsed.data.fileExtension}` : undefined
  );
  return signed.data?.signedUrl ? { ...parsed.data, signedUrl: signed.data.signedUrl } : null;
}

/** Converts only RPC-authorized media paths into temporary browser URLs. */
async function createSafePhotoUrls(
  repository: PublicPortfolioRepository,
  media: PublicMediaDescriptor[]
): Promise<PortfolioPhoto[]> {
  const photos = await Promise.all(media.map(async (item): Promise<PortfolioPhoto | null> => {
    const signed = await repository.createPhotoUrl(item.accessPath, 60 * 60);
    if (!signed.data?.signedUrl) return null;
    return {
      id: item.key,
      src: signed.data.signedUrl,
      alt: item.altText || "Portfolio photo",
      mediaType: item.mediaType,
      width: item.width,
      height: item.height,
      aspectRatio: item.aspectRatio || (item.width && item.height ? item.width / item.height : undefined),
      orientation: item.orientation || classifyPhotoOrientation(item.width, item.height),
      presentation: item.presentation,
    };
  }));
  return photos.filter((photo): photo is PortfolioPhoto => photo !== null);
}
