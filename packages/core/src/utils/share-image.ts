import { formatCompactNumber } from "../format/currency";
import { clampProbability, probabilityToCents } from "../format/probability";
import type { PolymarketMarket, ShareCardSvgOptions } from "../types/market";

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 630;

const themes = {
  dark: {
    page: "#0b0a0c",
    card: "#201f27",
    cardShade: "#17161c",
    cardStroke: "#45424c",
    accent: "#d28457",
    accentSoft: "#34231b",
    accentStroke: "#865338",
    ceramic: "#ece9e1",
    ceramicText: "#1c1a19",
    text: "#f0ede7",
    muted: "#aaa5ad",
    surface: "#0f0e12",
    surfaceStroke: "#3d3a43",
    live: "#55cfb3",
  },
  light: {
    page: "#efede7",
    card: "#e5e0d8",
    cardShade: "#d6d0c7",
    cardStroke: "#aca49a",
    accent: "#a75c3a",
    accentSoft: "#ead9cd",
    accentStroke: "#bc8366",
    ceramic: "#faf7f1",
    ceramicText: "#211e1b",
    text: "#211e1b",
    muted: "#6d655e",
    surface: "#f7f3ed",
    surfaceStroke: "#bdb5ab",
    live: "#188c77",
  },
};

export function escapeSvg(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function truncate(value: string, maxLength: number): string {
  return value.length > maxLength
    ? `${value.slice(0, Math.max(0, maxLength - 3))}...`
    : value;
}

export function splitText(value: string, maxLength: number, maxLines: number): string[] {
  const lines: string[] = [];
  let current = "";

  for (const word of value.split(/\s+/).filter(Boolean)) {
    const next = current ? `${current} ${word}` : word;

    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  if (lines.length > maxLines) {
    const visible = lines.slice(0, maxLines);
    visible[maxLines - 1] = truncate(visible[maxLines - 1] ?? "", maxLength);
    return visible;
  }

  return lines;
}

function statValue(label: string, value: number | null | undefined) {
  return value ? { label, value: formatCompactNumber(value) } : null;
}

const MAX_IMAGE_URL_LENGTH = 2048;

/**
 * Allowlist for photo URLs used as card backgrounds.
 * Accepts absolute http(s) URLs, base64 data URIs and site-relative paths.
 * Anything else (javascript:, blob:, oversized, empty) is rejected so the
 * value can be safely interpolated into SVG attributes and CSS url("...").
 */
export function sanitizeImageUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed || trimmed.length > MAX_IMAGE_URL_LENGTH) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^data:image\/(png|jpeg|gif|webp|svg\+xml);base64,[a-z0-9+/=]+$/i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }

  return null;
}

/**
 * Resolves the photo for a share card: explicit override first, then the
 * market's own Gamma image/icon. Returns null when nothing usable exists.
 */
export function resolveBackgroundImage(
  market: Pick<PolymarketMarket, "image" | "icon">,
  override?: string | null | undefined,
): string | null {
  return (
    sanitizeImageUrl(override) ??
    sanitizeImageUrl(market.image) ??
    sanitizeImageUrl(market.icon)
  );
}

/** Escapes a sanitized URL for interpolation inside CSS url("..."). */
export function escapeCssUrl(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/[\r\n]+/g, "");
}

function preserveAspectRatioForPosition(position: string | null | undefined): string {
  const normalized = (position ?? "").trim().toLowerCase();

  // Default matches ShareCard ("right center"): face on the right.
  if (!normalized || /(^|\s)right(\s|$)/.test(normalized)) {
    return "xMaxYMid slice";
  }

  if (/(^|\s)left(\s|$)/.test(normalized)) {
    return "xMinYMid slice";
  }

  return "xMidYMid slice";
}

export function createShareCardSvg(
  market: PolymarketMarket,
  options: ShareCardSvgOptions = {},
): string {
  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;
  // Photo cards always use the dark treatment so text stays legible over
  // the picture, regardless of the requested theme.
  const photo = resolveBackgroundImage(market, options.backgroundImage);
  const theme = photo ? themes.dark : themes[options.theme ?? "dark"];
  const attribution = options.attribution ?? "polymarket-ui-kit";
  const statusLabel = options.statusLabel ?? "Live market";
  const leadingOutcome = market.outcomes[0];
  const probability = leadingOutcome ? clampProbability(leadingOutcome.price ?? 0) : 0;
  const probabilityWidth = Math.round(340 * probability);
  const questionLines = splitText(market.question, 43, 3)
    .map(
      (line, index) =>
        `<text x="112" y="${202 + index * 43}" fill="${theme.ceramicText}" font-family="Arial, sans-serif" font-size="38" font-weight="900" letter-spacing="-1.5">${escapeSvg(line)}</text>`,
    )
    .join("\n  ");
  const stats = [
    statValue("Volume", market.volume),
    statValue("Liquidity", market.liquidity),
    statValue("Comments", market.commentCount),
  ].filter((item): item is { label: string; value: string } => Boolean(item));
  const visibleStats = stats.length
    ? stats.slice(0, 2)
    : [{ label: "Status", value: market.status }];
  const statsSvg = visibleStats
    .map((stat, index) => {
      const y = 375 + index * 82;
      return `<text x="774" y="${y}" fill="${theme.muted}" font-family="Consolas, monospace" font-size="16" letter-spacing="1.2">${escapeSvg(stat.label.toUpperCase())}</text>
  <text x="774" y="${y + 34}" fill="${theme.text}" font-family="Arial, sans-serif" font-size="30" font-weight="850">${escapeSvg(stat.value)}</text>`;
    })
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${DEFAULT_WIDTH} ${DEFAULT_HEIGHT}" role="img" aria-label="${escapeSvg(market.question)}">
  <defs>
    <linearGradient id="pui-metal" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="${theme.card}"/>
      <stop offset="0.55" stop-color="${theme.cardShade}"/>
      <stop offset="1" stop-color="${theme.card}"/>
    </linearGradient>
${photo ? `    <linearGradient id="pui-photo-scrim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0.38" stop-color="#081228" stop-opacity="0.94"/>
      <stop offset="0.68" stop-color="#081228" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#081228" stop-opacity="0.28"/>
    </linearGradient>
` : ""}    <clipPath id="pui-card-clip"><rect x="54" y="46" width="1092" height="538" rx="18"/></clipPath>
  </defs>
  <rect width="1200" height="630" fill="${theme.page}"/>
  <rect x="54" y="46" width="1092" height="538" rx="18" fill="url(#pui-metal)" stroke="${theme.cardStroke}"/>
  <g clip-path="url(#pui-card-clip)">
${photo ? `    <image href="${escapeSvg(photo)}" x="54" y="46" width="1092" height="538" preserveAspectRatio="${preserveAspectRatioForPosition(options.backgroundPosition)}"/>\n    <rect x="54" y="46" width="1092" height="538" fill="url(#pui-photo-scrim)"/>\n` : ""}    <path d="M760 46h196L690 584H494z" fill="${theme.accentSoft}" opacity="0.48"/>
  </g>
  <circle cx="74" cy="66" r="5" fill="${theme.muted}"/>
  <circle cx="1126" cy="66" r="5" fill="${theme.muted}"/>
  <rect x="90" y="78" width="24" height="30" rx="3" fill="${theme.cardShade}" stroke="${theme.cardStroke}"/>
  <rect x="102" y="86" width="25" height="30" rx="3" fill="${theme.ceramic}" stroke="${theme.cardStroke}"/>
  <path d="M96 97h38" stroke="${theme.accent}" stroke-width="3"/>
  <text x="148" y="102" fill="${theme.text}" font-family="Arial, sans-serif" font-size="19" font-weight="850">POLYMARKET UI KIT</text>
  <circle cx="884" cy="97" r="5" fill="${theme.live}"/>
  <text x="900" y="102" fill="${theme.muted}" font-family="Consolas, monospace" font-size="14" letter-spacing="1.2">${escapeSvg(statusLabel)}</text>
  <rect x="90" y="136" width="1020" height="148" rx="7" fill="${theme.ceramic}" stroke="${theme.cardStroke}"/>
  <text x="112" y="168" fill="${theme.accent}" font-family="Consolas, monospace" font-size="13" letter-spacing="1.1">MARKET / ${escapeSvg((market.category ?? "PREDICTION").toUpperCase())}</text>
  ${questionLines}
  <rect x="90" y="306" width="640" height="194" rx="7" fill="${theme.surface}" stroke="${theme.surfaceStroke}"/>
  <text x="116" y="344" fill="${theme.muted}" font-family="Consolas, monospace" font-size="14" letter-spacing="1.2">LEADING OUTCOME</text>
  <text x="116" y="390" fill="${theme.text}" font-family="Arial, sans-serif" font-size="28" font-weight="800">${escapeSvg(truncate(leadingOutcome?.name ?? "Outcome", 26))}</text>
  <text x="522" y="406" fill="${theme.accent}" font-family="Arial, sans-serif" font-size="74" font-weight="900" letter-spacing="-3">${escapeSvg(probabilityToCents(leadingOutcome?.price))}</text>
  <rect x="116" y="452" width="340" height="4" fill="${theme.card}"/>
  <rect x="116" y="452" width="${probabilityWidth}" height="4" fill="${theme.accent}"/>
  <rect x="750" y="306" width="360" height="194" rx="7" fill="${theme.cardShade}" stroke="${theme.surfaceStroke}"/>
  ${statsSvg}
  <text x="90" y="548" fill="${theme.muted}" font-family="Consolas, monospace" font-size="13" letter-spacing="1.1">CIVIC FORECAST / CALIBRATED EDITION</text>
  <text x="840" y="548" fill="${theme.muted}" font-family="Consolas, monospace" font-size="13">${escapeSvg(truncate(attribution, 30))}</text>
</svg>`;
}
