import { BuilderFeeDisclosure, MarketCard, ShareCard } from "@polymarket-ui-kit/react";
import type { CardVisualMode } from "@polymarket-ui-kit/core";
import { RouteThemeSync } from "../../components/RouteThemeSync";
import { sampleBuilder } from "../../../components/sample-builder";
import { loadPublicMarketBundle } from "../../../components/live-data";

export const revalidate = 60;

type EmbedPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    attribution?: string;
    backgroundImage?: string;
    builderCode?: string;
    surface?: string;
    theme?: string;
    visual?: string;
  }>;
};

function resolveTheme(value: string | undefined): "light" | "dark" {
  return value === "light" ? "light" : "dark";
}

function resolveVisual(value: string | undefined): CardVisualMode {
  return value === "subject" || value === "scene" || value === "none"
    ? value
    : "auto";
}

function resolveSurface(value: string | undefined) {
  if (value === "market-card" || value === "builder-disclosure") {
    return value;
  }

  return "share-card";
}

export default async function EmbedPage({ params, searchParams }: EmbedPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const theme = resolveTheme(query.theme);
  const surface = resolveSurface(query.surface);
  const builder = query.builderCode
    ? { ...sampleBuilder, code: query.builderCode }
    : sampleBuilder;
  const { market, points } = await loadPublicMarketBundle(slug);

  return (
    <>
      <RouteThemeSync theme={theme} />
      <div className="civic-embed-surface">
        {surface === "market-card" ? (
          <MarketCard market={market} points={points} />
        ) : null}
        {surface === "share-card" ? (
          <ShareCard
            market={market}
            visual={resolveVisual(query.visual)}
            {...(query.backgroundImage
              ? { backgroundImage: query.backgroundImage }
              : {})}
          />
        ) : null}
        {surface === "builder-disclosure" ? (
          <BuilderFeeDisclosure
            builder={builder}
            notional={100}
            price={market.outcomes[0]?.price ?? undefined}
            side="taker"
          />
        ) : null}
      </div>
    </>
  );
}
