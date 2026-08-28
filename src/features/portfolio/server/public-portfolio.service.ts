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

/** Caps a private signed capability at five minutes without allowing it to outlive its reveal grant. */
export function privateCapabilityTtl(expiresAt: string, now = Date.now()) {
  const remainingSeconds = Math.floor((Date.parse(expiresAt) - now) / 1000);
  return remainingSeconds > 0 ? Math.min(5 * 60, remainingSeconds) : null;
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
    if (approved.success && approved.data.accessExpiresAt && privateCapabilityTtl(approved.data.accessExpiresAt)) {
      resolved = approved.data;
      accessMode = "approved";
    }
  }

  return {
    ...resolved,
    accessMode,
    photos: await createSafePhotoUrls(
      repository,
      resolved.media,
      accessMode === "approved" && resolved.accessExpiresAt
        ? privateCapabilityTtl(resolved.accessExpiresAt)
        : 60 * 60
    ),
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
  const ttl = privateCapabilityTtl(parsed.data.accessExpiresAt);
  if (!ttl) return null;
  const signed = await repository.createHoroscopeUrl(
    parsed.data.accessPath,
    ttl,
    undefined
  );
  return signed.data?.signedUrl ? { ...parsed.data, signedUrl: signed.data.signedUrl } : null;
}

/** Converts only RPC-authorized media paths into temporary browser URLs. */
async function createSafePhotoUrls(
  repository: PublicPortfolioRepository,
  media: PublicMediaDescriptor[],
  expiresInSeconds: number | null
): Promise<PortfolioPhoto[]> {
  if (!expiresInSeconds) return [];
  const photos = await Promise.all(media.map(async (item): Promise<PortfolioPhoto | null> => {
    const signed = await repository.createPhotoUrl(item.accessPath, expiresInSeconds);
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
