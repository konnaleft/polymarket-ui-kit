import {
  buildComboIntent,
  buildClobV2MarketOrderDraft,
  buildEmbedUrl,
  ClobV2OrderDraftError,
  buildIframeSnippet,
  buildReactSnippet,
  buildShareImageUrl,
  buildEmbedShotUrl,
  copyShareImageToClipboard,
  createShareCardSvg,
  formatCurrency,
  formatProbability,
  getBuilderFeeBps,
  listComboMarkets,
  getPriceHistory,
  normalizeComboMarket,
  normalizeComboMarketsPage,
  normalizeMarket,
  normalizePriceHistory,
  PolymarketEmbedError,
  previewFees,
  resolveBackgroundImage,
  resolvePolymarketSlug,
  sanitizeImageUrl,
  withQuery,
} from "@polymarket-ui-kit/core";
import { describe, expect, it, vi } from "vitest";

describe("core formatters", () => {
  it("formats probability values", () => {
    expect(formatProbability(0.642)).toBe("64%");
  });

  it("formats currency values", () => {
    expect(formatCurrency(1234, { compact: true })).toContain("$");
  });
});

describe("core adapters", () => {
  it("normalizes Gamma-style market payloads", () => {
    const market = normalizeMarket({
      id: "1",
      slug: "sample",
      question: "Will it work?",
      active: true,
      outcomes: '["Yes","No"]',
      outcomePrices: '["0.7","0.3"]',
      clobTokenIds: '["yes","no"]',
    });

    expect(market.status).toBe("open");
    expect(market.outcomes[0]?.price).toBe(0.7);
  });

  it("builds URLs with query params", () => {
    expect(withQuery("https://example.com/path", { limit: 10 })).toBe(
      "https://example.com/path?limit=10",
    );
  });

  it("normalizes CLOB price history points", () => {
    const points = normalizePriceHistory(
      {
        history: [
          { t: 1719878400, p: "0.64" },
          { timestamp: "2026-06-02T00:00:00Z", price: 0.66 },
        ],
      },
      "token-yes",
    );

    expect(points).toHaveLength(2);
    expect(points[0]).toMatchObject({
      outcomeId: "token-yes",
      price: 0.64,
      timestamp: "2024-07-02T00:00:00.000Z",
    });
  });

  it("fetches price history with public CLOB query parameters", async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ history: [{ t: 1719878400, p: 0.64 }] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    const points = await getPriceHistory(
      { tokenId: "token-yes", interval: "1h", fidelity: 5 },
      { clobBaseUrl: "https://example.com", fetch: fetcher as typeof fetch },
    );
    const requestedUrl = String(fetcher.mock.calls[0]?.[0]);

    expect(requestedUrl).toContain("https://example.com/prices-history");
    expect(requestedUrl).toContain("market=token-yes");
    expect(requestedUrl).toContain("interval=1h");
    expect(requestedUrl).toContain("fidelity=5");
    expect(points[0]?.price).toBe(0.64);
  });

  it("builds CLOB V2 market order drafts with builder attribution", () => {
    const market = normalizeMarket({
      id: "1",
      slug: "sample",
      question: "Will it work?",
      active: true,
      outcomes: '["Yes","No"]',
      outcomePrices: '["0.7","0.3"]',
      clobTokenIds: '["yes-token","no-token"]',
    });
    const draft = buildClobV2MarketOrderDraft({
      market,
      outcome: market.outcomes[0]!,
      notional: 25,
      builderCode:
        "0x00000000000000000000000000000000000000000000000000000000000000f5",
    });

    expect(draft).toMatchObject({
      amount: 25,
      builderCode:
        "0x00000000000000000000000000000000000000000000000000000000000000f5",
      marketSlug: "sample",
      orderType: "FOK",
      outcomeId: "0",
      price: 0.7,
      side: "BUY",
      tokenID: "yes-token",
    });
  });

  it("rejects CLOB V2 market order drafts without builder code", () => {
    const market = normalizeMarket({
      id: "1",
      question: "Will it work?",
      active: true,
      outcomes: '["Yes","No"]',
      outcomePrices: '["0.7","0.3"]',
      clobTokenIds: '["yes-token","no-token"]',
    });

    expect(() =>
      buildClobV2MarketOrderDraft({
        market,
        outcome: market.outcomes[0]!,
        notional: 25,
      }),
    ).toThrowError(ClobV2OrderDraftError);
  });

  it("rejects CLOB V2 market order drafts without token id", () => {
    expect(() =>
      buildClobV2MarketOrderDraft({
        builderCode:
          "0x00000000000000000000000000000000000000000000000000000000000000f5",
        notional: 25,
        outcome: { id: "yes", name: "Yes", price: 0.7 },
      }),
    ).toThrowError(ClobV2OrderDraftError);
  });

  it("rejects CLOB V2 market order drafts with invalid notional", () => {
    expect(() =>
      buildClobV2MarketOrderDraft({
        builderCode:
          "0x00000000000000000000000000000000000000000000000000000000000000f5",
        notional: 0,
        outcome: { id: "yes", name: "Yes", price: 0.7, tokenId: "yes-token" },
      }),
    ).toThrowError(ClobV2OrderDraftError);
  });

  it("rejects CLOB V2 market order drafts without price guard", () => {
    expect(() =>
      buildClobV2MarketOrderDraft({
        builderCode:
          "0x00000000000000000000000000000000000000000000000000000000000000f5",
        notional: 25,
        outcome: { id: "yes", name: "Yes", price: null, tokenId: "yes-token" },
      }),
    ).toThrowError(ClobV2OrderDraftError);
  });
});

describe("combo-aware core", () => {
  const rawComboMarket = {
    id: "combo-market-1",
    condition_id: "condition-1",
    slug: "will-btc-and-eth-rally",
    question: "Will BTC and ETH both rally this month?",
    category: "Crypto",
    volume: "1500000",
    tags: [{ label: "crypto" }, "combo"],
    position_ids: ["position-yes", "position-no"],
    outcomes: ["Yes", "No"],
    outcome_prices: ["0.41", "0.59"],
  };

  it("normalizes combo market legs by shared array index", () => {
    const combo = normalizeComboMarket(rawComboMarket);

    expect(combo.conditionId).toBe("condition-1");
    expect(combo.title).toBe("Will BTC and ETH both rally this month?");
    expect(combo.tags).toEqual(["crypto", "combo"]);
    expect(combo.outcomes[0]).toMatchObject({
      name: "Yes",
      positionId: "position-yes",
      price: 0.41,
    });
    expect(combo.outcomes[1]).toMatchObject({
      name: "No",
      positionId: "position-no",
      price: 0.59,
    });
  });

  it("normalizes combo market pages from public API shapes", () => {
    const page = normalizeComboMarketsPage({
      data: [rawComboMarket],
      next_cursor: "next-page",
    });

    expect(page.markets).toHaveLength(1);
    expect(page.nextCursor).toBe("next-page");
  });

  it("fetches combo markets from the public RFQ catalog endpoint", async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ data: [rawComboMarket] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    const page = await listComboMarkets(
      { cursor: "abc", exclude: ["one", "two"], limit: 5 },
      { combosBaseUrl: "https://example.com", fetch: fetcher as typeof fetch },
    );
    const requestedUrl = String(fetcher.mock.calls[0]?.[0]);

    expect(requestedUrl).toContain("https://example.com/v1/rfq/combo-markets");
    expect(requestedUrl).toContain("limit=5");
    expect(requestedUrl).toContain("cursor=abc");
    expect(requestedUrl).toContain("exclude=one%2Ctwo");
    expect(page.markets[0]?.outcomes[0]?.positionId).toBe("position-yes");
  });

  it("builds combo intents for host-side RFQ flows", () => {
    const market = normalizeComboMarket(rawComboMarket);
    const intent = buildComboIntent({
      builderCode: "0xabc",
      legs: [{ market, outcome: market.outcomes[0]! }],
      size: 25,
    });

    expect(intent).toMatchObject({
      builderCode: "0xabc",
      direction: "BUY",
      side: "YES",
      size: 25,
      source: "ui-kit",
    });
    expect(intent.legs[0]).toMatchObject({
      conditionId: "condition-1",
      positionId: "position-yes",
      price: 0.41,
    });
  });
});

describe("share image export", () => {
  it("creates escaped SVG share cards", () => {
    const market = normalizeMarket({
      id: "1",
      slug: "sample",
      question: 'Will <script>alert("x")</script> resolve?',
      active: true,
      outcomes: '["Yes","No"]',
      outcomePrices: '["0.7","0.3"]',
      volume: 1000,
    });
    const svg = createShareCardSvg(market, {
      attribution: "test-studio",
      statusLabel: "Fixture fallback",
      theme: "light",
    });

    expect(svg).toContain('role="img"');
    expect(svg).toContain("test-studio");
    expect(svg).toContain("Fixture fallback");
    expect(svg).toContain("#a75c3a");
    expect(svg).toContain("#188c77");
    expect(svg).not.toContain("#f59e0b");
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).not.toContain("<script>");
  });
});

describe("distribution embed helpers", () => {
  it("resolves plain Polymarket slugs", () => {
    expect(resolvePolymarketSlug("Will-Bitcoin-Hit-100k-In-2026")).toBe(
      "will-bitcoin-hit-100k-in-2026",
    );
  });

  it("resolves Polymarket event URLs", () => {
    expect(
      resolvePolymarketSlug("https://polymarket.com/event/will-bitcoin-hit-100k-in-2026"),
    ).toBe("will-bitcoin-hit-100k-in-2026");
  });

  it("strips query and hash from Polymarket URLs", () => {
    expect(
      resolvePolymarketSlug(
        "https://polymarket.com/event/will-bitcoin-hit-100k-in-2026?ref=builder#comments",
      ),
    ).toBe("will-bitcoin-hit-100k-in-2026");
  });

  it("rejects invalid embed inputs", () => {
    expect(() => resolvePolymarketSlug("https://example.com/event/x")).toThrowError(
      PolymarketEmbedError,
    );
    expect(() => resolvePolymarketSlug("not a slug")).toThrowError(PolymarketEmbedError);
  });

  it("builds iframe snippets with encoded embed routes", () => {
    const snippet = buildIframeSnippet({
      attribution: "builder studio",
      baseUrl: "https://demo.example",
      slug: "will-bitcoin-hit-100k-in-2026",
      surface: "share-card",
      theme: "light",
    });

    expect(snippet).toContain("iframe");
    expect(snippet).toContain("https://demo.example/embed/will-bitcoin-hit-100k-in-2026");
    expect(snippet).toContain("surface=share-card");
    expect(snippet).toContain("theme=light");
    expect(snippet).toContain("attribution=builder+studio");
  });

  it("builds React snippets for the selected surface", () => {
    expect(
      buildReactSnippet({
        slug: "will-bitcoin-hit-100k-in-2026",
        surface: "share-card",
      }),
    ).toContain("ShareCard");
    expect(
      buildReactSnippet({
        builderCode:
          "0x00000000000000000000000000000000000000000000000000000000000000f5",
        slug: "will-bitcoin-hit-100k-in-2026",
        surface: "builder-disclosure",
      }),
    ).toContain("BuilderFeeDisclosure");
  });

  it("builds OG PNG and SVG URLs with theme and attribution", () => {
    const png = buildShareImageUrl({
      attribution: "forecast studio",
      baseUrl: "https://demo.example",
      format: "png",
      slug: "will-bitcoin-hit-100k-in-2026",
      theme: "light",
    });
    const svg = buildShareImageUrl({
      attribution: "forecast studio",
      baseUrl: "https://demo.example",
      format: "svg",
      slug: "will-bitcoin-hit-100k-in-2026",
      theme: "light",
    });

    expect(png).toContain("format=png");
    expect(svg).toContain("format=svg");
    expect(png).toContain("theme=light");
    expect(svg).toContain("attribution=forecast+studio");
  });

  it("builds deterministic embed URLs", () => {
    expect(
      buildEmbedUrl({
        builderCode: "0xabc",
        slug: "will-bitcoin-hit-100k-in-2026",
        surface: "builder-disclosure",
        theme: "dark",
      }),
    ).toBe(
      "/embed/will-bitcoin-hit-100k-in-2026?surface=builder-disclosure&theme=dark&builderCode=0xabc",
    );
  });
});

describe("share card photo backgrounds", () => {
  const photoMarket = normalizeMarket({
    id: "1",
    slug: "sample",
    question: "Will Milei win?",
    active: true,
    outcomes: '["Yes","No"]',
    outcomePrices: '["0.53","0.47"]',
    volume: 168000,
    image: "https://polymarket.com/milei.jpg",
  });

  it("sanitizes photo URLs with an allowlist", () => {
    expect(sanitizeImageUrl("https://example.com/a.jpg")).toBe(
      "https://example.com/a.jpg",
    );
    expect(sanitizeImageUrl("/milei.jpg")).toBe("/milei.jpg");
    expect(sanitizeImageUrl(null)).toBeNull();
    expect(sanitizeImageUrl("")).toBeNull();
    expect(sanitizeImageUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeImageUrl("//evil.com/x.jpg")).toBeNull();
    expect(sanitizeImageUrl("data:text/html,<b>x</b>")).toBeNull();
    expect(sanitizeImageUrl(`https://x.com/a.jpg${"a".repeat(2100)}`)).toBeNull();
  });

  it("resolves override first, then market image and icon", () => {
    expect(
      resolveBackgroundImage(photoMarket, "https://example.com/custom.jpg"),
    ).toBe("https://example.com/custom.jpg");
    expect(resolveBackgroundImage(photoMarket)).toBe(
      "https://polymarket.com/milei.jpg",
    );
    expect(
      resolveBackgroundImage({ image: null, icon: "/icon.png" }),
    ).toBe("/icon.png");
    expect(
      resolveBackgroundImage({ image: null, icon: null }, "javascript:x"),
    ).toBeNull();
  });

  it("renders the photo layer and forces the dark treatment", () => {
    const svg = createShareCardSvg(photoMarket, {
      backgroundImage: "https://example.com/milei.jpg",
      theme: "light",
    });

    expect(svg).toContain("<image");
    expect(svg).toContain("https://example.com/milei.jpg");
    expect(svg).toContain("pui-photo-scrim");
    expect(svg).toContain('preserveAspectRatio="xMaxYMid slice"');
    // Dark treatment wins over the requested light theme.
    expect(svg).toContain("#d28457");
    expect(svg).not.toContain("#a75c3a");
  });

  it("defaults to the market image without an override", () => {
    const svg = createShareCardSvg(photoMarket, { theme: "dark" });

    expect(svg).toContain("<image");
    expect(svg).toContain("https://polymarket.com/milei.jpg");
  });

  it("keeps flat cards byte-identical without a photo", () => {
    const market = normalizeMarket({
      id: "2",
      slug: "flat",
      question: "Flat card?",
      active: true,
      outcomes: '["Yes","No"]',
      outcomePrices: '["0.5","0.5"]',
    });
    const svg = createShareCardSvg(market, { theme: "dark" });

    expect(svg).not.toContain("<image");
    expect(svg).not.toContain("pui-photo-scrim");
  });

  it("plumbs backgroundImage through embed and OG URLs", () => {
    const embed = buildEmbedUrl({
      backgroundImage: "https://example.com/m.jpg",
      slug: "will-bitcoin-hit-100k-in-2026",
      surface: "share-card",
      theme: "dark",
    });
    const og = buildShareImageUrl({
      backgroundImage: "https://example.com/m.jpg",
      format: "png",
      slug: "will-bitcoin-hit-100k-in-2026",
      theme: "dark",
    });

    expect(embed).toContain("backgroundImage=https%3A%2F%2Fexample.com%2Fm.jpg");
    expect(og).toContain("backgroundImage=https%3A%2F%2Fexample.com%2Fm.jpg");
  });
});

describe("fee preview", () => {
  it("calculates legacy builder fees from basis points", () => {
    const preview = previewFees({ notional: 100, builderFeeBps: 25 });
    expect(preview.builderFee).toBe(0.25);
    expect(preview.builderFeeBps).toBe(25);
    expect(preview.totalCost).toBe(100.25);
  });

  it("selects taker builder fees from side-specific inputs", () => {
    const preview = previewFees({
      notional: 100,
      builderFeeSide: "taker",
      builderTakerFeeBps: 40,
      builderMakerFeeBps: 10,
    });

    expect(getBuilderFeeBps(preview)).toBe(40);
    expect(preview.builderFee).toBe(0.4);
    expect(preview.builderFeeSide).toBe("taker");
  });

  it("selects maker builder fees from side-specific inputs", () => {
    const preview = previewFees({
      notional: 100,
      builderFeeSide: "maker",
      builderTakerFeeBps: 40,
      builderMakerFeeBps: 10,
    });

    expect(preview.builderFee).toBe(0.1);
    expect(preview.builderFeeBps).toBe(10);
    expect(preview.builderFeeSide).toBe("maker");
  });

  it("does not charge builder fees when no rate is provided", () => {
    const preview = previewFees({ notional: 100 });
    expect(preview.builderFee).toBe(0);
    expect(preview.builderFeeBps).toBe(0);
  });
});

describe("copyShareImageToClipboard", () => {
  const pngBytes = new Blob(["fake-png"], { type: "image/png" });
  const url = "https://demo.test/api/og?slug=sample&format=png";

  function makeEnv(overrides: Record<string, unknown> = {}) {
    const calls: { fetched: string[]; written: Array<Record<string, Blob>>[] } = {
      fetched: [],
      written: [],
    };

    return {
      calls,
      env: {
        fetchImage: async (target: string) => {
          calls.fetched.push(target);
          return { ok: true, blob: async () => pngBytes };
        },
        writeItems: async (items: Array<Record<string, Blob>>) => {
          calls.written.push(items);
        },
        ...overrides,
      },
    };
  }

  it("fetches the png and writes it to the clipboard", async () => {
    const { calls, env } = makeEnv();

    await expect(copyShareImageToClipboard(url, env)).resolves.toBe("copied");
    expect(calls.fetched).toEqual([url]);
    expect(calls.written).toHaveLength(1);
    expect(calls.written[0]?.[0]).toHaveProperty("image/png", pngBytes);
  });

  it("reports unsupported without an environment", async () => {
    await expect(copyShareImageToClipboard(url, null)).resolves.toBe("unsupported");
  });

  it("reports failed when the download fails", async () => {
    const throwing = makeEnv({
      fetchImage: async () => {
        throw new Error("offline");
      },
    });
    await expect(copyShareImageToClipboard(url, throwing.env)).resolves.toBe("failed");

    const badStatus = makeEnv({
      fetchImage: async () => ({ ok: false, blob: async () => pngBytes }),
    });
    await expect(copyShareImageToClipboard(url, badStatus.env)).resolves.toBe("failed");

    const empty = makeEnv({
      fetchImage: async () => ({
        ok: true,
        blob: async () => new Blob([], { type: "image/png" }),
      }),
    });
    await expect(copyShareImageToClipboard(url, empty.env)).resolves.toBe("failed");
  });

  it("maps clipboard permission denials to denied", async () => {
    const denied = makeEnv({
      writeItems: async () => {
        throw new DOMException("denied", "NotAllowedError");
      },
    });
    await expect(copyShareImageToClipboard(url, denied.env)).resolves.toBe("denied");

    const broken = makeEnv({
      writeItems: async () => {
        throw new Error("boom");
      },
    });
    await expect(copyShareImageToClipboard(url, broken.env)).resolves.toBe("failed");
  });
});

describe("buildEmbedShotUrl", () => {
  it("builds the embed-shot URL with params", () => {
    const url = buildEmbedShotUrl({
      baseUrl: "https://demo.test",
      slug: "sample-embed",
      theme: "dark",
      attribution: "pui-kit/demo",
    });

    expect(url).toBe(
      "https://demo.test/api/embed-shot?slug=sample-embed&theme=dark&attribution=pui-kit%2Fdemo",
    );
  });

  it("supports relative URLs without a base", () => {
    expect(buildEmbedShotUrl({ slug: "sample-embed" })).toBe(
      "/api/embed-shot?slug=sample-embed&theme=dark",
    );
  });
});
