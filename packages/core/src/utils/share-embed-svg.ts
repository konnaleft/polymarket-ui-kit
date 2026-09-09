import { formatCompactNumber } from "../format/currency";
import { clampProbability, probabilityToCents } from "../format/probability";
import type { PolymarketMarket, ShareCardSvgOptions } from "../types/market";
import {
  escapeSvg,
  resolveBackgroundImage,
  splitText,
  truncate,
} from "./share-image";

export interface EmbedShotUrlOptions {
  baseUrl?: string | undefined;
  slug: string;
  theme?: ShareCardSvgOptions["theme"];
  attribution?: string | undefined;
  backgroundImage?: string | null | undefined;
  backgroundPosition?: string | undefined;
}

/**
 * Absolute URL of the embed-style PNG snapshot (`/api/embed-shot`).
 * Used by the Studio "Copy image" button in the EMBED tab.
 */
export function buildEmbedShotUrl(options: EmbedShotUrlOptions): string {
  const params = new URLSearchParams();
  params.set("slug", options.slug);

  if (options.theme) {
    params.set("theme", options.theme);
  }

  if (options.attribution) {
    params.set("attribution", options.attribution);
  }

  if (options.backgroundImage) {
    params.set("backgroundImage", options.backgroundImage);
  }

  if (options.backgroundPosition) {
    params.set("backgroundPosition", options.backgroundPosition);
  }

  const path = `/api/embed-shot?${params.toString()}`;
  return options.baseUrl ? new URL(path, options.baseUrl).toString() : path;
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

function statValue(label: string, value: number | null | undefined) {
  return value ? { label, value: formatCompactNumber(value) } : null;
}

/**
 * SVG replica of the React `<ShareCard>` (embed) layout: market photo on the
 * right behind the dark scrim, "Polymarket" brand with live pill, big white
 * question, frosted leading-outcome panel and the volume/liquidity bar.
 * Rasterize it (e.g. with sharp) to produce the PNG users paste into X.
 */
export function createShareCardEmbedSvg(
  market: PolymarketMarket,
  options: ShareCardSvgOptions = {},
): string {
  const width = options.width ?? 1200;
  const height = options.height ?? 630;
  // Photo cards always use the dark treatment so text stays legible over
  // the picture, mirroring ShareCard.
  const photo = resolveBackgroundImage(market, options.backgroundImage);
  const attribution = (options.attribution ?? "polymarket-ui-kit").toUpperCase();
  const statusLabel = (options.statusLabel ?? "Live market").toUpperCase();
  const kicker = (market.category ?? "Prediction market").toUpperCase();
  const leadingOutcome = market.outcomes[0];
  const probability = leadingOutcome ? clampProbability(leadingOutcome.price ?? 0) : 0;
  const barWidth = Math.round(332 * probability);
  // Left column ends where the frosted quote panel starts (x=740), so lines
  // stay clear of it: ~23 chars at 56px ≈ 640px from x=64.
  const questionLines = splitText(market.question, 23, 3)
    .map(
      (line, index) =>
        `<text x="64" y="${272 + index * 62}" fill="#ffffff" font-family="Arial, sans-serif" font-size="56" font-weight="800" letter-spacing="-1">${escapeSvg(line)}</text>`,
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
      const x = 96 + index * 264;
      return `<text x="${x}" y="502" fill="#8fa1bd" font-family="Consolas, monospace" font-size="15" letter-spacing="1.2">${escapeSvg(stat.label.toUpperCase())}</text>
  <text x="${x}" y="540" fill="#ffffff" font-family="Arial, sans-serif" font-size="30" font-weight="800">${escapeSvg(stat.value)}</text>`;
    })
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 1200 630" role="img" aria-label="${escapeSvg(market.question)}">
  <defs>
    <clipPath id="pui-embed-clip"><rect x="0" y="0" width="1200" height="630" rx="28"/></clipPath>
${photo ? `    <linearGradient id="pui-embed-scrim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0.38" stop-color="#081228" stop-opacity="0.94"/>
      <stop offset="0.68" stop-color="#081228" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#081228" stop-opacity="0.28"/>
    </linearGradient>
` : ""}  </defs>
  <rect width="1200" height="630" fill="#0a1428"/>
  <g clip-path="url(#pui-embed-clip)">
${photo ? `    <image href="${escapeSvg(photo)}" x="0" y="0" width="1200" height="630" preserveAspectRatio="${preserveAspectRatioForPosition(options.backgroundPosition)}"/>
    <rect x="0" y="0" width="1200" height="630" fill="url(#pui-embed-scrim)"/>
` : ""}    <rect x="18" y="18" width="1164" height="594" rx="20" fill="none" stroke="#ffffff" stroke-opacity="0.16"/>
    <text x="64" y="80" fill="#ffffff" font-family="Arial, sans-serif" font-size="34" font-weight="800">Polymarket</text>
    <rect x="292" y="52" width="150" height="34" rx="17" fill="#f0ede8"/>
    <text x="367" y="75" fill="#33415c" font-family="Consolas, monospace" font-size="16" letter-spacing="1" text-anchor="middle">${escapeSvg(statusLabel)}</text>
    <text x="1136" y="80" fill="#9fb0c9" font-family="Consolas, monospace" font-size="17" letter-spacing="1" text-anchor="end">${escapeSvg(truncate(attribution, 30))}</text>
    <text x="64" y="212" fill="#8fa1bd" font-family="Consolas, monospace" font-size="18" letter-spacing="1.5">${escapeSvg(truncate(kicker, 40))}</text>
  ${questionLines}
    <rect x="740" y="180" width="396" height="300" rx="14" fill="#060e20" fill-opacity="0.45" stroke="#ffffff" stroke-opacity="0.22"/>
    <text x="772" y="226" fill="#8fa1bd" font-family="Consolas, monospace" font-size="16" letter-spacing="1.2">LEADING OUTCOME</text>
    <text x="772" y="272" fill="#ffffff" font-family="Arial, sans-serif" font-size="30" font-weight="700">${escapeSvg(truncate(leadingOutcome?.name ?? "Outcome", 18))}</text>
    <text x="1104" y="362" fill="#ffffff" font-family="Arial, sans-serif" font-size="84" font-weight="800" text-anchor="end">${escapeSvg(probabilityToCents(leadingOutcome?.price))}</text>
    <rect x="772" y="402" width="332" height="3" fill="#ffffff" fill-opacity="0.18"/>
    <rect x="772" y="402" width="${barWidth}" height="3" fill="#5aa9ff"/>
    <rect x="64" y="470" width="640" height="100" rx="12" fill="#060e20" fill-opacity="0.45" stroke="#ffffff" stroke-opacity="0.22"/>
  ${statsSvg}
  </g>
</svg>`;
}
