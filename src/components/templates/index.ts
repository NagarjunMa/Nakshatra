import CelestialUnion from "./CelestialUnion";
import type { PortfolioData } from "@/types/portfolio";
import type { ComponentType } from "react";

export interface TemplateProps {
  data: PortfolioData;
  themeColor: string;
  sunSign: string | null;
}

const TEMPLATES: Record<number, ComponentType<TemplateProps>> = {
  1: CelestialUnion,
};

export function getTemplate(
  templateId: number
): ComponentType<TemplateProps> {
  return TEMPLATES[templateId] || CelestialUnion;
}
