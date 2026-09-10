import { ImageResponse } from "next/og";
import {
  clampProbability,
  formatCents,
  formatCompactNumber,
  looksLikeCutout,
  resolveBackgroundImage,
  resolveCardVisual,
  type CardVisualMode,
} from "@polymarket-ui-kit/core";
import { loadPublicMarket } from "../../../components/live-data";

export const runtime = "edge";
export const revalidate = 300;

const BASE_WIDTH = 1200;
const BASE_HEIGHT = 630;

function resolveVisual(value: string | null): CardVisualMode {
  return value === "subject" || value === "scene" || value === "none"
    ? value
    : "auto";
}

/**
 * next/og fetches images server-side, so site-relative photo paths must be
 * resolved against the request origin. Absolute and data: URLs pass through.
 */
function resolvePhotoUrl(
  value: string | null,
  requestUrl: string,
): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (/^(https?:|data:image\/)/i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return new URL(trimmed, new URL(requestUrl).origin).toString();
  }

  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug =
    searchParams.get("slug") ?? "who-will-win-the-2028-us-presidential-election";
  // Snapshots always use the dark treatment (mirrors ShareCard photo cards),
  // so the ?theme= param is accepted but intentionally ignored.
  const scale = searchParams.get("scale") === "2" ? 2 : 1;
  // ?attribution= is accepted for URL compatibility but no longer rendered:
  // the topline shows the real market category (Grok mock).
  const { market } = await loadPublicMarket(slug);
  // Explicit ?backgroundImage= override, else the market's own Gamma image.
  const rawPhoto = resolveBackgroundImage(market, searchParams.get("backgroundImage"));
  const visual = resolveCardVisual(rawPhoto, resolveVisual(searchParams.get("visual")));
  const photo = resolvePhotoUrl(rawPhoto, request.url);
  // Rectangular photo forced into subject mode: blend with a fade (option B).
  const subjectFade =
    visual.kind === "subject" && visual.src && !looksLikeCutout(visual.src);
  const category = (market.category ?? "Prediction market").toUpperCase();
  const leadingOutcome = market.outcomes[0];
  const probability = leadingOutcome ? clampProbability(leadingOutcome.price ?? 0) : 0;
  const stats = [
    market.volume
      ? { label: "Volume", value: formatCompactNumber(market.volume) }
      : null,
    market.liquidity
      ? { label: "Liquidity", value: formatCompactNumber(market.liquidity) }
      : null,
    market.commentCount
      ? { label: "Comments", value: formatCompactNumber(market.commentCount) }
      : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));
  const visibleStats = stats.length
    ? stats.slice(0, 2)
    : [{ label: "Status", value: market.status }];

  // @2x export: every dimension scales so 2400x1260 matches 1200x630 exactly.
  const px = (n: number) => Math.round(n * scale);
  const width = BASE_WIDTH * scale;
  const height = BASE_HEIGHT * scale;

  const response = new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#081228",
        display: "flex",
        fontFamily: "Arial, sans-serif",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <div
        style={{
          borderRadius: px(28),
          display: "flex",
          flexDirection: "column",
          height,
          overflow: "hidden",
          padding: `${px(46)}px ${px(64)}px`,
          position: "relative",
          width,
        }}
      >
        {visual.kind === "scene" && photo ? (
          <img
            src={photo}
            alt=""
            style={{
              height,
              left: 0,
              objectFit: "cover",
              objectPosition: "center right",
              position: "absolute",
              top: 0,
              width,
            }}
          />
        ) : null}
        {visual.kind === "subject" && photo ? (
          <img
            src={photo}
            alt=""
            style={{
              bottom: px(-20),
              height: px(680),
              objectFit: "contain",
              objectPosition: "right bottom",
              position: "absolute",
              right: px(-24),
              width: px(620),
            }}
          />
        ) : null}
        {visual.kind !== "none" && photo ? (
          <div
            style={{
              background:
                "linear-gradient(90deg, rgba(8, 18, 40, 1) 42%, rgba(8, 18, 40, 0.62) 62%, rgba(8, 18, 40, 0.18) 100%)",
              display: "flex",
              height,
              left: 0,
              position: "absolute",
              top: 0,
              width,
            }}
          />
        ) : null}
        {subjectFade && photo ? (
          <div
            style={{
              background:
                "linear-gradient(90deg, rgba(8, 18, 40, 1) 20%, rgba(8, 18, 40, 0) 60%)",
              display: "flex",
              height,
              position: "absolute",
              right: 0,
              top: 0,
              width: px(672),
            }}
          />
        ) : null}
        <div
          style={{
            border: "1px solid rgba(255, 255, 255, 0.16)",
            borderRadius: px(20),
            display: "flex",
            height: height - px(36),
            left: px(18),
            position: "absolute",
            top: px(18),
            width: width - px(36),
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            position: "relative",
            width: px(696),
          }}
        >
          <div
            style={{
              alignItems: "center",
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <strong style={{ color: "#ffffff", fontSize: px(34), fontWeight: 800 }}>
              Polymarket Trend
            </strong>
            <span
              style={{
                color: "#9fb0c9",
                fontFamily: "Consolas, monospace",
                fontSize: px(17),
                letterSpacing: px(1),
              }}
            >
              {category}
            </span>
          </div>

          <span
            style={{
              color: "#8fa1bd",
              fontFamily: "Consolas, monospace",
              fontSize: px(18),
              letterSpacing: px(1.5),
              marginTop: px(40),
            }}
          >
            {category}
          </span>

          <div
            style={{
              color: "#ffffff",
              fontSize: px(50),
              fontWeight: 800,
              letterSpacing: px(-1),
              lineHeight: 1.08,
              marginTop: px(14),
              maxHeight: px(164),
              overflow: "hidden",
              width: px(640),
            }}
          >
            {market.question}
          </div>

          <span
            style={{
              color: "#8fa1bd",
              fontFamily: "Consolas, monospace",
              fontSize: px(16),
              letterSpacing: px(1.2),
              marginTop: px(22),
            }}
          >
            LEADING OUTCOME
          </span>
          <div
            style={{
              alignItems: "baseline",
              display: "flex",
              gap: px(28),
              marginTop: px(6),
            }}
          >
            <strong style={{ color: "#ffffff", fontSize: px(30) }}>
              {leadingOutcome?.name ?? "Outcome"}
            </strong>
            <strong
              style={{ color: "#ffffff", fontSize: px(88), fontWeight: 800, letterSpacing: px(-3) }}
            >
              {formatCents(leadingOutcome?.price)}
            </strong>
          </div>
          <div
            style={{
              background: "rgba(255, 255, 255, 0.16)",
              borderRadius: px(99),
              display: "flex",
              height: px(6),
              marginTop: px(14),
              width: px(220),
            }}
          >
            <span
              style={{
                background: "#22d3ee",
                borderRadius: px(99),
                display: "flex",
                width: `${Math.round(probability * 100)}%`,
              }}
            />
          </div>

          <div
            style={{
              background: "rgba(6, 14, 32, 0.45)",
              border: "1px solid rgba(255, 255, 255, 0.22)",
              borderRadius: px(12),
              display: "flex",
              gap: px(90),
              marginTop: "auto",
              padding: `${px(18)}px ${px(28)}px`,
              position: "relative",
              width: px(560),
            }}
          >
            {visibleStats.map((stat) => (
              <div
                key={stat.label}
                style={{ display: "flex", flexDirection: "column" }}
              >
                <span
                  style={{
                    color: "#8fa1bd",
                    fontFamily: "Consolas, monospace",
                    fontSize: px(15),
                    letterSpacing: px(1.2),
                  }}
                >
                  {stat.label.toUpperCase()}
                </span>
                <strong style={{ color: "#ffffff", fontSize: px(30), marginTop: px(8) }}>
                  {stat.value}
                </strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    { width, height },
  );

  response.headers.set(
    "cache-control",
    "public, max-age=300, stale-while-revalidate=3600",
  );
  return response;
}
