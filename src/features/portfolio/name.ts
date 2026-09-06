export interface PortfolioNameParts {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  name?: string;
}

function clean(value?: string | null) {
  return value?.trim() || "";
}

/** Builds the canonical display name while preserving an empty middle name. */
export function composePortfolioName(parts: PortfolioNameParts) {
  return [parts.first_name, parts.middle_name, parts.last_name]
    .map(clean)
    .filter(Boolean)
    .join(" ");
}

/** Provides editable name parts for legacy drafts that stored only one full-name string. */
export function resolvePortfolioNameParts(parts: PortfolioNameParts) {
  const explicit = [parts.first_name, parts.middle_name, parts.last_name].some((value) => clean(value));
  if (explicit) {
    return {
      first_name: clean(parts.first_name),
      middle_name: clean(parts.middle_name),
      last_name: clean(parts.last_name),
    };
  }

  const tokens = clean(parts.name).split(/\s+/).filter(Boolean);
  if (tokens.length <= 1) {
    return { first_name: tokens[0] || "", middle_name: "", last_name: "" };
  }
  return {
    first_name: tokens[0],
    middle_name: tokens.slice(1, -1).join(" "),
    last_name: tokens.at(-1) || "",
  };
}

/** Normalizes old and new drafts to one canonical full name plus explicit parts. */
export function normalizePortfolioName<T extends PortfolioNameParts>(personal: T): T & Required<Omit<PortfolioNameParts, "name">> & { name: string } {
  const resolved = resolvePortfolioNameParts(personal);
  return {
    ...personal,
    ...resolved,
    name: composePortfolioName(resolved) || clean(personal.name),
  };
}
