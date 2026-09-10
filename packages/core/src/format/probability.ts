export function clampProbability(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function formatProbability(
  value: number | null | undefined,
  maximumFractionDigits = 0,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits,
  }).format(clampProbability(value));
}

export function probabilityToCents(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  return `${Math.round(clampProbability(value) * 100)}c`;
}

/**
 * Grok-style Trend card price: "19¢" with the real cent sign.
 * Used by ShareCard and /api/embed-shot; other surfaces keep
 * probabilityToCents for backward compatibility.
 */
export function formatCents(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  return `${Math.round(clampProbability(value) * 100)}¢`;
}

