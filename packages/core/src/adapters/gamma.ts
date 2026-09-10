import { fetchJson } from "../utils/fetcher";
import { asNumber, asStringArray, isRecord } from "../utils/invariant";
import type {
  ListMarketsParams,
  MarketAdapterOptions,
  MarketOutcome,
  PolymarketMarket,
  SearchMarketsParams,
} from "../types/market";
import type { ListCommentsParams, MarketComment } from "../types/comments";

const GAMMA_BASE_URL = "https://gamma-api.polymarket.com";

interface GammaSearchResponse {
  markets?: unknown[];
  events?: unknown[];
}

function field(record: Record<string, unknown>, key: string): unknown {
  return record[key];
}

/** Gamma tags arrive as objects ({label, slug, ...}); keep their labels. */
function asTagLabels(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : [];
  return raw
    .map((item) =>
      isRecord(item)
        ? String(item.label ?? item.name ?? item.slug ?? "")
        : String(item ?? ""),
    )
    .map((label) => label.trim())
    .filter(Boolean);
}

function parseOutcomes(record: Record<string, unknown>): MarketOutcome[] {
  const names = asStringArray(field(record, "outcomes"));
  const prices = asStringArray(field(record, "outcomePrices"));
  const tokenIds = asStringArray(field(record, "clobTokenIds"));

  if (names.length === 0) {
    const yesPrice =
      asNumber(field(record, "lastTradePrice")) ??
      asNumber(field(record, "bestAsk")) ??
      asNumber(field(record, "bestBid"));
    return [
      { id: "yes", name: "Yes", price: yesPrice, tokenId: tokenIds[0] },
      {
        id: "no",
        name: "No",
        price: yesPrice === null ? null : 1 - yesPrice,
        tokenId: tokenIds[1],
      },
    ];
  }

  return names.map((name, index) => ({
    id: String(index),
    name,
    price: asNumber(prices[index]) ?? null,
    tokenId: tokenIds[index],
  }));
}

export function normalizeMarket(raw: unknown): PolymarketMarket {
  const record = isRecord(raw) ? raw : {};
  const id = String(field(record, "id") ?? field(record, "conditionId") ?? "");
  const slug = String(field(record, "slug") ?? id);
  const active = Boolean(field(record, "active"));
  const closed = Boolean(field(record, "closed"));
  const archived = Boolean(field(record, "archived"));

  return {
    id,
    slug,
    question: String(
      field(record, "question") ??
        field(record, "title") ??
        field(record, "description") ??
        "Untitled market",
    ),
    description: String(field(record, "description") ?? "") || null,
    category: String(field(record, "category") ?? "") || null,
    image:
      String(field(record, "image") ?? field(record, "featuredImage") ?? "") ||
      null,
    icon: String(field(record, "icon") ?? "") || null,
    status: archived ? "archived" : closed ? "closed" : active ? "open" : "unknown",
    active,
    closed,
    archived,
    endDate:
      String(field(record, "endDateIso") ?? field(record, "endDate") ?? "") ||
      null,
    volume:
      asNumber(field(record, "volumeNum")) ?? asNumber(field(record, "volume")),
    volume24hr: asNumber(field(record, "volume24hr")),
    liquidity:
      asNumber(field(record, "liquidityNum")) ??
      asNumber(field(record, "liquidity")),
    openInterest: asNumber(field(record, "openInterest")),
    commentCount: asNumber(field(record, "commentCount")),
    lastTradePrice: asNumber(field(record, "lastTradePrice")),
    bestBid: asNumber(field(record, "bestBid")),
    bestAsk: asNumber(field(record, "bestAsk")),
    outcomes: parseOutcomes(record),
    clobTokenIds: asStringArray(field(record, "clobTokenIds")),
    tags: asTagLabels(field(record, "tags")),
    url: slug ? `https://polymarket.com/event/${slug}` : undefined,
    raw,
  };
}

export async function listMarkets(
  params: ListMarketsParams = {},
  options: MarketAdapterOptions = {},
): Promise<PolymarketMarket[]> {
  const data = await fetchJson<unknown[]>(
    `${options.gammaBaseUrl ?? GAMMA_BASE_URL}/markets`,
    {
      fetch: options.fetch,
      query: {
        limit: params.limit,
        offset: params.offset,
        active: params.active,
        closed: params.closed,
        archived: params.archived,
        order: params.order,
        ascending: params.ascending,
        tag_id: params.tagId,
      },
    },
  );

  return data.map(normalizeMarket);
}

export async function getMarketBySlug(
  slug: string,
  options: MarketAdapterOptions = {},
): Promise<PolymarketMarket> {
  const data = await fetchJson<unknown>(
    `${options.gammaBaseUrl ?? GAMMA_BASE_URL}/markets/slug/${slug}`,
    { fetch: options.fetch },
  );

  const market = normalizeMarket(data);

  // Market records rarely carry a category; the parent event's tags do
  // (e.g. "Politics" for Hormuz). Enrich silently — failures keep the fallback.
  if (!market.category && (market.tags ?? []).length === 0) {
    try {
      const events = await fetchJson<unknown[]>(
        `${options.gammaBaseUrl ?? GAMMA_BASE_URL}/events`,
        { fetch: options.fetch, query: { slug } },
      );
      const firstEvent = isRecord(events[0]) ? events[0] : {};
      const labels = asTagLabels(firstEvent.tags);
      if (labels.length > 0) {
        return { ...market, category: labels[0], tags: labels };
      }
    } catch {
      // Keep the unenriched market; callers fall back to "Prediction market".
    }
  }

  return market;
}

export async function searchMarkets(
  params: SearchMarketsParams = {},
  options: MarketAdapterOptions = {},
): Promise<PolymarketMarket[]> {
  const data = await fetchJson<GammaSearchResponse>(
    `${options.gammaBaseUrl ?? GAMMA_BASE_URL}/public-search`,
    {
      fetch: options.fetch,
      query: {
        q: params.q,
        limit: params.limit,
        offset: params.offset,
        categories: params.categories?.join(","),
      },
    },
  );

  return [...(data.markets ?? []), ...(data.events ?? [])].map(normalizeMarket);
}

export async function listComments(
  params: ListCommentsParams = {},
  options: MarketAdapterOptions = {},
): Promise<MarketComment[]> {
  const data = await fetchJson<unknown[]>(
    `${options.gammaBaseUrl ?? GAMMA_BASE_URL}/comments`,
    {
      fetch: options.fetch,
      query: {
        limit: params.limit,
        offset: params.offset,
        order: params.order,
        ascending: params.ascending,
        parent_entity_type: params.parentEntityType,
        parent_entity_id: params.parentEntityId,
        get_positions: params.getPositions,
        holders_only: params.holdersOnly,
      },
    },
  );

  return data.map((comment) => {
    const record = isRecord(comment) ? comment : {};
    return {
      id: String(record.id ?? ""),
      body: typeof record.body === "string" ? record.body : null,
      parentEntityType:
        typeof record.parentEntityType === "string"
          ? record.parentEntityType
          : null,
      parentEntityID: asNumber(record.parentEntityID),
      parentCommentID:
        typeof record.parentCommentID === "string" ? record.parentCommentID : null,
      userAddress:
        typeof record.userAddress === "string" ? record.userAddress : null,
      replyAddress:
        typeof record.replyAddress === "string" ? record.replyAddress : null,
      createdAt: typeof record.createdAt === "string" ? record.createdAt : null,
      updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : null,
      profile: isRecord(record.profile) ? record.profile : null,
      reactionCount: asNumber(record.reactionCount),
      reportCount: asNumber(record.reportCount),
      raw: comment,
    };
  });
}

