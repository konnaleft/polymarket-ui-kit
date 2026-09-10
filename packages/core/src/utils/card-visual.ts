/** Visual treatment for a Trend share card. */
export type CardVisualKind = "subject" | "scene" | "none";

export interface CardVisual {
  kind: CardVisualKind;
  /** Image URL for subject/scene. Null when kind is "none". */
  src: string | null;
}

export type CardVisualMode = CardVisualKind | "auto";

export function looksLikeCutout(url: string): boolean {
  const normalized = url.toLowerCase();
  // Only explicit cutout naming counts: Gamma serves rectangular photos
  // in .png too, so the extension alone proves nothing. A plain
  // transparent PNG (e.g. milei.png) is covered by explicit mode="subject".
  return normalized.includes("-cutout.") || normalized.includes("/subjects/");
}

/** Display category: real Gamma category, else first event tag, else fallback. */
export function resolveMarketCategory(market: {
  category?: string | null | undefined;
  tags?: string[] | undefined;
}): string {
  const category = (market.category ?? "").trim();
  if (category) {
    return category;
  }

  const tag = (market.tags ?? []).map((t) => t.trim()).find(Boolean);
  return tag ?? "Prediction market";
}

/**
 * Resolves how a Trend card should render its visual.
 *
 * - Explicit mode ("subject" | "scene" | "none") always wins.
 * - "auto": cutout-named images become "subject" (transparent PNG floating
 *   over navy); any other image becomes "scene" (rectangular photos blend
 *   with a fade instead of pretending to be cutouts); no image → "none".
 */
export function resolveCardVisual(
  imageUrl: string | null | undefined,
  mode: CardVisualMode = "auto",
): CardVisual {
  if (mode !== "auto") {
    return mode === "none" ? { kind: "none", src: null } : { kind: mode, src: imageUrl ?? null };
  }

  if (!imageUrl) {
    return { kind: "none", src: null };
  }

  return looksLikeCutout(imageUrl)
    ? { kind: "subject", src: imageUrl }
    : { kind: "scene", src: imageUrl };
}
