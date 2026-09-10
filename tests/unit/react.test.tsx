import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  BuilderFeeDisclosure,
  CommentList,
  ComboBuilderCard,
  ComboShareCard,
  EmbedSnippetPanel,
  EvidenceRail,
  LeaderboardTable,
  MarketCard,
  MobileTradeDrawer,
  OrderbookPanel,
  PolymarketProvider,
  PollMarketComparison,
  ShareCard,
  useMarket,
  useComboMarkets,
  usePolymarketBuilder,
  usePriceHistory,
  useShareImage,
} from "@polymarket-ui-kit/react";
import {
  fixtureComments,
  fixtureComboLegs,
  fixtureComboMarkets,
  fixtureMarket,
  fixtureOrderbook,
  fixturePoints,
  fixtureRows,
} from "../fixtures/market";

describe("React components", () => {
  it("renders a market card", () => {
    render(<MarketCard market={fixtureMarket} points={fixturePoints} />);
    expect(screen.getByText(fixtureMarket.question)).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument();
  });

  it("renders an orderbook", () => {
    render(<OrderbookPanel orderbook={fixtureOrderbook} />);
    expect(screen.getByText("Orderbook")).toBeInTheDocument();
  });

  it("renders comments", () => {
    render(<CommentList comments={fixtureComments} />);
    expect(
      screen.getByText("This project has a very clear DX angle."),
    ).toBeInTheDocument();
  });

  it("renders a share card", () => {
    render(<ShareCard market={fixtureMarket} />);
    expect(screen.getByText("Polymarket Trend")).toBeInTheDocument();
    expect(screen.getAllByText("Open Source").length).toBeGreaterThan(0);
  });

  it("renders leaderboard rows", () => {
    render(<LeaderboardTable rows={fixtureRows} />);
    expect(screen.getByText("Top Builder")).toBeInTheDocument();
  });

  it("renders evidence sources and respects maxVisible", () => {
    render(
      <EvidenceRail
        items={[
          {
            id: "official",
            title: "Certification calendar",
            publisher: "State election board",
            kind: "official",
          },
          {
            id: "poll",
            title: "Sample voter survey",
            publisher: "Demo research desk",
            kind: "poll",
          },
          {
            id: "model",
            title: "Turnout scenario",
            publisher: "Civic model lab",
            kind: "model",
          },
        ]}
        maxVisible={2}
      />,
    );

    expect(screen.getByText("Certification calendar")).toBeInTheDocument();
    expect(screen.getByText("Sample voter survey")).toBeInTheDocument();
    expect(screen.queryByText("Turnout scenario")).not.toBeInTheDocument();
    expect(screen.getByLabelText("1 more sources")).toBeInTheDocument();
  });

  it("renders evidence and comparison empty states", () => {
    render(
      <>
        <EvidenceRail items={[]} />
        <PollMarketComparison rows={[]} />
      </>,
    );

    expect(screen.getByText("No evidence sources")).toBeInTheDocument();
    expect(screen.getByText("No comparison data")).toBeInTheDocument();
  });

  it("renders null-safe poll and market comparison rows", () => {
    render(
      <PollMarketComparison
        rows={[
          {
            id: "long-outcome",
            label:
              "A deliberately long outcome label that must wrap without breaking the table",
            pollShare: null,
            marketProbability: 0.614,
            sampleSize: 1287,
            marginOfErrorPoints: 2.8,
          },
        ]}
      />,
    );

    expect(screen.getByText(/deliberately long outcome/)).toBeInTheDocument();
    expect(screen.getByText("61%")).toBeInTheDocument();
    expect(screen.getByText("No comparison")).toBeInTheDocument();
  });
});

const fixtureBuilder = {
  name: "Forecast Studio",
  handle: "@forecast-studio",
  code: "0x00000000000000000000000000000000000000000000000000000000000000f5",
  makerFeeBps: 10,
  takerFeeBps: 25,
};

function BuilderProbe() {
  const builder = usePolymarketBuilder();
  return <span>{builder?.code ?? "no-builder"}</span>;
}

function ShareImageProbe() {
  const image = useShareImage({
    attribution: "studio",
    baseUrl: "https://example.com",
    format: "svg",
    slug: fixtureMarket.slug,
    theme: "light",
  });

  return <a href={image.url}>{image.downloadName}</a>;
}

function PriceHistoryProbe() {
  const history = usePriceHistory(
    { tokenId: "token-yes", interval: "1w" },
    { initialData: fixturePoints, refetchOnMount: false },
  );

  return <span>{history.data?.length ?? 0}</span>;
}

function ComboMarketsProbe() {
  const combos = useComboMarkets(
    { limit: 2 },
    {
      initialData: { markets: fixtureComboMarkets },
      refetchOnMount: false,
    },
  );

  return <span>{combos.data?.markets.length ?? 0}</span>;
}

function DisabledMarketProbe() {
  const market = useMarket(fixtureMarket.slug, { enabled: false });
  return <span>{market.isLoading ? "loading" : "idle"}</span>;
}

describe("Public hooks", () => {
  it("builds share image URLs with format, theme, and attribution", () => {
    render(<ShareImageProbe />);
    const link = screen.getByRole("link", { name: `${fixtureMarket.slug}.svg` });
    const href = link.getAttribute("href") ?? "";

    expect(href).toContain("https://example.com/api/og");
    expect(href).toContain(`slug=${fixtureMarket.slug}`);
    expect(href).toContain("format=svg");
    expect(href).toContain("theme=light");
    expect(href).toContain("attribution=studio");
  });

  it("uses initial price history without refetching on mount", () => {
    render(<PriceHistoryProbe />);
    expect(screen.getByText(String(fixturePoints.length))).toBeInTheDocument();
  });

  it("does not fetch disabled market hooks", () => {
    const fetcher = vi.fn();

    render(
      <PolymarketProvider fetch={fetcher as typeof fetch}>
        <DisabledMarketProbe />
      </PolymarketProvider>,
    );

    expect(screen.getByText("idle")).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("uses initial combo markets without refetching on mount", () => {
    render(<ComboMarketsProbe />);
    expect(screen.getByText(String(fixtureComboMarkets.length))).toBeInTheDocument();
  });
});

describe("Embed distribution panel", () => {
  it("renders iframe, React, registry, PNG, and SVG outputs", () => {
    render(
      <EmbedSnippetPanel
        attribution="forecast studio"
        baseUrl="https://demo.example"
        input="https://polymarket.com/event/will-bitcoin-hit-100k-in-2026?ref=x"
        surface="share-card"
        theme="light"
      />,
    );

    expect(screen.getByText("will-bitcoin-hit-100k-in-2026")).toBeInTheDocument();
    expect(screen.getByText(/<iframe/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "React" }));
    expect(screen.getByText(/ShareCard/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "OG" }));
    expect(screen.getByText(/format=png/)).toBeInTheDocument();
    expect(screen.getByText(/format=svg/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Registry" }));
    expect(screen.getByText(/npx shadcn@latest add/)).toBeInTheDocument();
  });

  it("renders invalid input states and disables copy actions", () => {
    render(<EmbedSnippetPanel input="https://example.com/event/nope" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Only polymarket.com URLs");
    for (const button of screen.getAllByRole("button", { name: "Copy" })) {
      expect(button).toBeDisabled();
    }
  });

  it("shows builder codes only as public attribution data", () => {
    render(
      <EmbedSnippetPanel
        builderCode="0x00000000000000000000000000000000000000000000000000000000000000f5"
        input="will-bitcoin-hit-100k-in-2026"
        surface="builder-disclosure"
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "React" }));
    expect(screen.getByText(/BuilderFeeDisclosure/)).toBeInTheDocument();
    expect(screen.queryByText(/private key/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/place order/i)).not.toBeInTheDocument();
  });
});

describe("Combo-aware UI", () => {
  it("renders a combo share card", () => {
    render(<ComboShareCard legs={fixtureComboLegs} title="Combo preview" />);

    expect(screen.getByText("Polymarket Combo")).toBeInTheDocument();
    expect(screen.getByText("Combo preview")).toBeInTheDocument();
    expect(screen.getByText(fixtureComboLegs[0]!.market.title)).toBeInTheDocument();
  });

  it("emits combo intents from selected public legs", () => {
    const onComboIntent = vi.fn();

    render(
      <ComboBuilderCard
        builderCode="0xabc"
        markets={fixtureComboMarkets}
        onComboIntent={onComboIntent}
        size={10}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Yes/i })[0]!);
    fireEvent.click(screen.getByRole("button", { name: /Emit combo intent/i }));

    expect(onComboIntent).toHaveBeenCalledTimes(1);
    expect(onComboIntent.mock.calls[0]?.[0]).toMatchObject({
      builderCode: "0xabc",
      size: 10,
      source: "ui-kit",
      legs: [
        {
          conditionId: fixtureComboMarkets[0]!.conditionId,
          positionId: fixtureComboMarkets[0]!.outcomes[0]!.positionId,
        },
      ],
    });
  });
});

describe("Builder-code-aware UX", () => {
  it("renders builder fee disclosure", () => {
    render(
      <BuilderFeeDisclosure
        builder={fixtureBuilder}
        notional={100}
        price={0.64}
        side="taker"
      />,
    );

    expect(screen.getByText("Builder code attached")).toBeInTheDocument();
    expect(screen.getByText("Forecast Studio")).toBeInTheDocument();
    expect(screen.getByText("25 bps")).toBeInTheDocument();
    expect(screen.getByText("$0.25")).toBeInTheDocument();
  });

  it("exposes builder config from the provider", () => {
    render(
      <PolymarketProvider builder={fixtureBuilder}>
        <BuilderProbe />
      </PolymarketProvider>,
    );

    expect(screen.getByText(fixtureBuilder.code)).toBeInTheDocument();
  });

  it("emits builder code and fee preview in trade intents", () => {
    const onTradeIntent = vi.fn();

    render(
      <MobileTradeDrawer
        builder={fixtureBuilder}
        market={fixtureMarket}
        onTradeIntent={onTradeIntent}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Continue with/i }));

    expect(onTradeIntent).toHaveBeenCalledTimes(1);
    expect(onTradeIntent.mock.calls[0]?.[0]).toMatchObject({
      builderCode: fixtureBuilder.code,
      builderFeeSide: "taker",
      feePreview: {
        builderFee: 0.0625,
        builderFeeBps: 25,
      },
    });
  });
});
