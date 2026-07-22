import CelestialUnion from "./CelestialUnion";
import EditorialMatrimonial from "./EditorialMatrimonial";
import type { PortfolioData } from "@/types/portfolio";

export interface TemplateProps {
  data: PortfolioData;
  themeColor: string;
  sunSign: string | null;
  accessMode?: "full" | "restricted";
}

export function BiodataTemplate({
  templateId,
  ...props
}: TemplateProps & { templateId: number }) {
  switch (templateId) {
    case 2:
      return <CelestialUnion {...props} />;
    case 1:
    default:
      return <EditorialMatrimonial {...props} />;
  }
}
