import type { ShareImageFormat, ShareImageTheme } from "../types/market";

export type EmbedSurface = "market-card" | "share-card" | "builder-disclosure";

export interface EmbedUrlOptions {
  slug: string;
  baseUrl?: string | undefined;
  surface?: EmbedSurface | undefined;
  theme?: ShareImageTheme | undefined;
  attribution?: string | undefined;
  builderCode?: string | undefined;
  /** Photo override for share-card surfaces. Empty = market.image default. */
  backgroundImage?: string | undefined;
}

export interface ShareImageUrlOptions {
  slug: string;
  baseUrl?: string | undefined;
  theme?: ShareImageTheme | undefined;
  format?: ShareImageFormat | undefined;
  attribution?: string | undefined;
  /** Photo override for the OG export. Empty = market.image default. */
  backgroundImage?: string | undefined;
}

export interface IframeSnippetOptions extends EmbedUrlOptions {

  title?: string | undefined;
  width?: number | undefined;
  height?: number | undefined;
}

export interface ReactSnippetOptions {
  slug: string;
  surface?: EmbedSurface | undefined;
  builderCode?: string | undefined;
}

export interface EmbedShotUrlOptions {
  slug: string;
  baseUrl?: string | undefined;
  theme?: ShareImageTheme | undefined;
  attribution?: string | undefined;
  /** Photo override for the embed-style snapshot. Empty = market.image default. */
  backgroundImage?: string | undefined;
}

export interface RegistryCommandOptions {
  item?: string | undefined;
  registryBaseUrl?: string | undefined;
}

export type PolymarketEmbedErrorCode = "EMPTY_INPUT" | "INVALID_URL" | "INVALID_HOST" | "INVALID_SLUG";

export class PolymarketEmbedError extends Error {
  code: PolymarketEmbedErrorCode;

  constructor(code: PolymarketEmbedErrorCode, message: string) {
    super(message);
    this.name = "PolymarketEmbedError";
    this.code = code;
  }
}

const DEFAULT_REGISTRY_BASE_URL = "https://polymarket-ui-kit-demo-jac10.vercel.app/r";
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function asAbsoluteUrl(path: string, baseUrl?: string): string {
  return baseUrl ? new URL(path, baseUrl).toString() : path;
}

function appendOptional(params: URLSearchParams, key: string, value: string | undefined) {
  if (value) {
    params.set(key, value);
  }
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeJsString(value: string): string {
  return JSON.stringify(value);
}

function normalizeSlug(value: string): string {
  const slug = value.trim().toLowerCase();

  if (!SLUG_PATTERN.test(slug) || slug.length > 180) {
    throw new PolymarketEmbedError(
      "INVALID_SLUG",
      "Use a Polymarket slug like will-bitcoin-hit-100k-in-2026.",
    );
  }

  return slug;
}

export function resolvePolymarketSlug(input: string): string {
  const value = input.trim();

  if (!value) {
    throw new PolymarketEmbedError("EMPTY_INPUT", "Paste a Polymarket URL or market slug.");
  }

  if (!value.includes("/") && !value.includes(".")) {
    return normalizeSlug(value);
  }

  const maybeUrl = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  let url: URL;

  try {
    url = new URL(maybeUrl);
  } catch {
    throw new PolymarketEmbedError("INVALID_URL", "Paste a valid Polymarket URL or market slug.");
  }

  if (url.hostname !== "polymarket.com" && url.hostname !== "www.polymarket.com") {
    throw new PolymarketEmbedError("INVALID_HOST", "Only polymarket.com URLs are supported.");
  }

  const parts = url.pathname
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  const prefix = parts[0];
  const slug = prefix === "event" || prefix === "market" ? parts[1] : parts[0];

  if (!slug) {
    throw new PolymarketEmbedError("INVALID_SLUG", "The Polymarket URL is missing a market slug.");
  }

  return normalizeSlug(decodeURIComponent(slug));
}

export function buildEmbedUrl({
  attribution,
  backgroundImage,
  baseUrl,
  builderCode,
  slug,
  surface = "share-card",
  theme = "dark",
}: EmbedUrlOptions): string {
  const resolvedSlug = resolvePolymarketSlug(slug);
  const params = new URLSearchParams({
    surface,
    theme,
  });

  appendOptional(params, "attribution", attribution);
  appendOptional(params, "builderCode", builderCode);
  appendOptional(params, "backgroundImage", backgroundImage);

  return asAbsoluteUrl(`/embed/${encodeURIComponent(resolvedSlug)}?${params.toString()}`, baseUrl);
}

export function buildShareImageUrl({
  attribution,
  backgroundImage,
  baseUrl,
  format = "png",
  slug,
  theme = "dark",
}: ShareImageUrlOptions): string {
  const params = new URLSearchParams({
    slug: resolvePolymarketSlug(slug),
    theme,
    format,
  });

  appendOptional(params, "attribution", attribution);
  appendOptional(params, "backgroundImage", backgroundImage);

  return asAbsoluteUrl(`/api/og?${params.toString()}`, baseUrl);
}

export function buildEmbedShotUrl({
  attribution,
  backgroundImage,
  baseUrl,
  slug,
  theme = "dark",
}: EmbedShotUrlOptions): string {
  const params = new URLSearchParams({
    slug: resolvePolymarketSlug(slug),
    theme,
  });

  appendOptional(params, "attribution", attribution);
  appendOptional(params, "backgroundImage", backgroundImage);

  return asAbsoluteUrl(`/api/embed-shot?${params.toString()}`, baseUrl);
}

export function buildIframeSnippet({
  height = 420,
  title,
  width = 720,
  ...options
}: IframeSnippetOptions): string {
  const resolvedSlug = resolvePolymarketSlug(options.slug);
  const src = buildEmbedUrl({ ...options, slug: resolvedSlug });
  const resolvedTitle = title ?? `Polymarket market: ${resolvedSlug}`;

  return `<iframe title="${escapeAttribute(resolvedTitle)}" src="${escapeAttribute(src)}" width="${width}" height="${height}" loading="lazy" style="border:0;width:100%;max-width:${width}px;height:${height}px;"></iframe>`;
}

export function buildReactSnippet({
  builderCode,
  slug,
  surface = "market-card",
}: ReactSnippetOptions): string {
  const resolvedSlug = resolvePolymarketSlug(slug);

  if (surface === "builder-disclosure") {
    const code = builderCode ?? "0x...";

    return `import { BuilderFeeDisclosure } from "@polymarket-ui-kit/react";

const builder = {
  name: "Your Builder",
  code: ${escapeJsString(code)},
  takerFeeBps: 25,
};

export function BuilderAttribution() {
  return <BuilderFeeDisclosure builder={builder} notional={100} side="taker" />;
}`;
  }

  if (surface === "share-card") {
    return `import { ShareCard, useMarket } from "@polymarket-ui-kit/react";

export function PolymarketShareEmbed() {
  const market = useMarket(${escapeJsString(resolvedSlug)});
  if (!market.data) return null;
  return <ShareCard market={market.data} attribution="your-product.com" />;
}`;
  }

  return `import { MarketCard, useMarket } from "@polymarket-ui-kit/react";

export function PolymarketMarketEmbed() {
  const market = useMarket(${escapeJsString(resolvedSlug)});
  if (!market.data) return null;
  return <MarketCard market={market.data} href={market.data.url} />;
}`;
}

export function buildRegistryCommand({
  item = "embed-studio",
  registryBaseUrl = DEFAULT_REGISTRY_BASE_URL,
}: RegistryCommandOptions = {}): string {
  return `npx shadcn@latest add ${registryBaseUrl.replace(/\/$/, "")}/${encodeURIComponent(item)}.json`;
}
