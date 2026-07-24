import CelestialUnion from "./CelestialUnion";
import EditorialMatrimonial from "./EditorialMatrimonial";
import RoyalHeritage from "./RoyalHeritage";
import type { PortfolioPhoto } from "@/features/media/portfolio-photo";
import type { PortfolioData } from "@/types/portfolio";

export interface TemplateProps {
  data: PortfolioData;
  themeColor: string;
  sunSign: string | null;
  accessMode?: "full" | "restricted";
  photos?: PortfolioPhoto[];
}

export function BiodataTemplate({
  templateId,
  ...props
}: TemplateProps & { templateId: number }) {
  switch (templateId) {
    case 3:
      return <RoyalHeritage {...props} />;
    case 2:
      return <CelestialUnion {...props} />;
    case 1:
    default:
      return <EditorialMatrimonial {...props} />;
  }
}
