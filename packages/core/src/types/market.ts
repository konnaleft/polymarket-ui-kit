export type MarketStatus = "open" | "closed" | "resolved" | "archived" | "unknown";

export interface MarketOutcome {
  id: string;
  name: string;
  price: number | null;
  tokenId?: string | undefined;
  color?: string | undefined;
}

export interface MarketPricePoint {
  timestamp: string;
  price: number;
  outcomeId?: string | undefined;
}

export type PriceHistoryInterval = "max" | "all" | "1m" | "1w" | "1d" | "6h" | "1h";

export interface PriceHistoryParams {
  tokenId: string;
  startTs?: number | undefined;
  endTs?: number | undefined;
  interval?: PriceHistoryInterval | undefined;
  fidelity?: number | undefined;
}

export type ShareImageTheme = "light" | "dark";
export type ShareImageFormat = "png" | "svg";

export type EvidenceKind = "official" | "poll" | "model" | "news" | "other";

export interface EvidenceItem {
  id: string;
  title: string;
  publisher: string;
  href?: string | undefined;
  publishedAt?: string | undefined;
  kind?: EvidenceKind | undefined;
}

export interface PollMarketComparisonRow {
  id: string;
  label: string;
  pollShare: number | null;
  marketProbability: number | null;
  sampleSize?: number | undefined;
  marginOfErrorPoints?: number | undefined;
  asOf?: string | undefined;
}

export interface ShareCardSvgOptions {
  theme?: ShareImageTheme | undefined;
  attribution?: string | undefined;
  statusLabel?: string | undefined;
  width?: number | undefined;
  height?: number | undefined;
  /**
   * Photo shown behind the card (lateral layout, face on the right).
   * Falls back to `market.image` / `market.icon` when omitted.
   * Photo cards always render with the dark treatment for legibility.
   */
  backgroundImage?: string | null | undefined;
  /** CSS-like position ("right center" default). Only horizontal edge is honored in SVG. */
  backgroundPosition?: string | undefined;
}

export interface PolymarketMarket {
  id: string;
  slug: string;
  question: string;
  description?: string | null | undefined;
  category?: string | null | undefined;
  image?: string | null | undefined;
  icon?: string | null | undefined;
  status: MarketStatus;
  active: boolean;
  closed: boolean;
  archived: boolean;
  endDate?: string | null | undefined;
  volume?: number | null | undefined;
  volume24hr?: number | null | undefined;
  liquidity?: number | null | undefined;
  openInterest?: number | null | undefined;
  commentCount?: number | null | undefined;
  lastTradePrice?: number | null | undefined;
  bestBid?: number | null | undefined;
  bestAsk?: number | null | undefined;
  outcomes: MarketOutcome[];
  clobTokenIds: string[];
  tags?: string[] | undefined;
  url?: string | undefined;
  raw?: unknown | undefined;
}

export interface ListMarketsParams {
  limit?: number | undefined;
  offset?: number | undefined;
  active?: boolean | undefined;
  closed?: boolean | undefined;
  archived?: boolean | undefined;
  order?: string | undefined;
  ascending?: boolean | undefined;
  tagId?: string | number | undefined;
}

export interface SearchMarketsParams {
  q?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
  categories?: string[] | undefined;
}

export interface MarketAdapterOptions {
  fetch?: typeof fetch | undefined;
  gammaBaseUrl?: string | undefined;
}
