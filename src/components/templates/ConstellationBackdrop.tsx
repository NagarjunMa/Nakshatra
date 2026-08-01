interface ConstellationBackdropProps {
  constellationPath: string | null;
  isLightBackground?: boolean;
  className?: string;
  variant?: "page" | "card";
}

/**
 * Places the selected rashi's existing constellation SVG behind a portfolio surface.
 * Input: a constellation path, background brightness, and optional layout classes. Output: a decorative image layer or null.
 */
export function ConstellationBackdrop({
  constellationPath,
  className = "",
  variant = "card",
}: ConstellationBackdropProps) {
  if (!constellationPath) return null;

  return (
    <div
      className={`portfolio-constellation portfolio-constellation-${variant} ${className}`}
      aria-hidden="true"
    >
      <span
        className="portfolio-constellation-shadow"
        style={{
          WebkitMaskImage: `url(${constellationPath})`,
          maskImage: `url(${constellationPath})`,
        }}
      />
      <span
        className="portfolio-constellation-highlight"
        style={{
          WebkitMaskImage: `url(${constellationPath})`,
          maskImage: `url(${constellationPath})`,
        }}
      />
    </div>
  );
}
