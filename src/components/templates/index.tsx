import CelestialUnion from "./CelestialUnion";
import type { PortfolioPhoto } from "@/features/media/portfolio-photo";
import type { PortfolioData, PortfolioHoroscopeAttachment } from "@/types/portfolio";

export interface TemplateProps {
  data: PortfolioData;
  themeColor: string;
  sunSign: string | null;
  accessMode?: "full" | "approved" | "restricted";
  photos?: PortfolioPhoto[];
  horoscopeAttachment?: PortfolioHoroscopeAttachment;
}

/**
 * Routes every persisted template ID to the single supported Celestial Union renderer.
 * Input: legacy template ID plus portfolio props. Output: canonical portfolio markup.
 */
export function BiodataTemplate(
  props: TemplateProps & { templateId: number }
) {
  return (
    <CelestialUnion
      data={props.data}
      themeColor={props.themeColor}
      sunSign={props.sunSign}
      accessMode={props.accessMode}
      photos={props.photos}
      horoscopeAttachment={props.horoscopeAttachment}
    />
  );
}
