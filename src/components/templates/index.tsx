import CelestialUnion from "./CelestialUnion";
import type { PortfolioData } from "@/types/portfolio";

export interface TemplateProps {
  data: PortfolioData;
  themeColor: string;
  sunSign: string | null;
}

export function BiodataTemplate({
  templateId,
  ...props
}: TemplateProps & { templateId: number }) {
  switch (templateId) {
    case 1:
    default:
      return <CelestialUnion {...props} />;
  }
}
