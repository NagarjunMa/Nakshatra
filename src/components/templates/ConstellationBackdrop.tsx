import Image from "next/image";

interface ConstellationBackdropProps {
  constellationPath: string | null;
  isLightBackground: boolean;
  className?: string;
}

/**
 * Places the selected rashi's existing constellation SVG behind a portfolio surface.
 * Input: a constellation path, background brightness, and optional layout classes. Output: a decorative image layer or null.
 */
export function ConstellationBackdrop({
  constellationPath,
  isLightBackground,
  className = "",
}: ConstellationBackdropProps) {
  if (!constellationPath) return null;

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <Image
        src={constellationPath}
        alt=""
        width={600}
        height={600}
        unoptimized
        className="absolute -right-12 -top-12 h-56 w-56 opacity-[0.09] sm:h-72 sm:w-72"
        style={{ filter: isLightBackground ? "none" : "invert(1)" }}
      />
    </div>
  );
}
