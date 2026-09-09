import { ImageResponse } from "next/og";
import {
  clampProbability,
  formatCompactNumber,
  probabilityToCents,
  resolveBackgroundImage,
} from "@polymarket-ui-kit/core";
import { loadPublicMarket } from "../../../components/live-data";

export const runtime = "edge";
export const revalidate = 300;

const imageSize = {
  width: 1200,
  height: 630,
};

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
  const attribution = (
    searchParams.get("attribution") ?? "polymarket-ui-kit"
  ).toUpperCase();
  const { market, source } = await loadPublicMarket(slug);
  // Explicit ?backgroundImage= override, else the market's own Gamma image.
  // Photo cards always render with the dark treatment for legibility.
  const photo = resolvePhotoUrl(
    resolveBackgroundImage(market, searchParams.get("backgroundImage")),
    request.url,
  );
  const kicker = (market.category ?? "Prediction market").toUpperCase();
  const statusLabel = source === "live" ? "LIVE MARKET" : "FIXTURE FALLBACK";
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

  const response = new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#0a1428",
        display: "flex",
        fontFamily: "Arial, sans-serif",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <div
        style={{
          borderRadius: 28,
          display: "flex",
          flexDirection: "column",
          height: 630,
          overflow: "hidden",
          padding: "46px 64px",
          position: "relative",
          width: 1200,
        }}
      >
        {photo ? (
          <img
            src={photo}
            alt=""
            style={{
              height: 630,
              left: 0,
              objectFit: "cover",
              position: "absolute",
              top: 0,
              width: 1200,
            }}
          />
        ) : null}
        {photo ? (
          <div
            style={{
              background:
                "linear-gradient(90deg, rgba(8, 18, 40, 0.94) 38%, rgba(8, 18, 40, 0.55) 68%, rgba(8, 18, 40, 0.28) 100%)",
              display: "flex",
              height: 630,
              left: 0,
              position: "absolute",
              top: 0,
              width: 1200,
            }}
          />
        ) : null}
        <div
          style={{
            border: "1px solid rgba(255, 255, 255, 0.16)",
            borderRadius: 20,
            display: "flex",
            height: 594,
            left: 18,
            position: "absolute",
            top: 18,
            width: 1164,
          }}
        />

        <div
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "space-between",
            position: "relative",
            width: "100%",
          }}
        >
          <div style={{ alignItems: "center", display: "flex", gap: 22 }}>
            <strong style={{ color: "#ffffff", fontSize: 34, fontWeight: 800 }}>
              Polymarket
            </strong>
            <div
              style={{
                alignItems: "center",
                background: "#f0ede8",
                borderRadius: 999,
                display: "flex",
                height: 34,
                justifyContent: "center",
                width: 150,
              }}
            >
              <span
                style={{
                  color: "#33415c",
                  fontFamily: "Consolas, monospace",
                  fontSize: 16,
                  letterSpacing: 1,
                }}
              >
                {statusLabel}
              </span>
            </div>
          </div>
          <span
            style={{
              color: "#9fb0c9",
              fontFamily: "Consolas, monospace",
              fontSize: 17,
              letterSpacing: 1,
            }}
          >
            {attribution}
          </span>
        </div>

        <span
          style={{
            color: "#8fa1bd",
            fontFamily: "Consolas, monospace",
            fontSize: 18,
            letterSpacing: 1.5,
            marginTop: 100,
            position: "relative",
          }}
        >
          {kicker}
        </span>

        <div
          style={{
            display: "flex",
            gap: 84,
            marginTop: 18,
            position: "relative",
          }}
        >
          <div
            style={{
              color: "#ffffff",
              fontSize: 50,
              fontWeight: 800,
              letterSpacing: -1,
              lineHeight: 1.04,
              maxHeight: 212,
              overflow: "hidden",
              width: 640,
            }}
          >
            {market.question}
          </div>

          <div
            style={{
              background: "rgba(6, 14, 32, 0.55)",
              border: "1px solid rgba(255, 255, 255, 0.22)",
              borderRadius: 14,
              display: "flex",
              flexDirection: "column",
              height: 300,
              marginTop: -92,
              padding: "30px 32px",
              width: 396,
            }}
          >
            <span
              style={{
                color: "#8fa1bd",
                fontFamily: "Consolas, monospace",
                fontSize: 16,
                letterSpacing: 1.2,
              }}
            >
              LEADING OUTCOME
            </span>
            <div
              style={{
                alignItems: "baseline",
                display: "flex",
                justifyContent: "space-between",
                marginTop: 14,
              }}
            >
              <strong style={{ color: "#ffffff", fontSize: 30 }}>
                {leadingOutcome?.name ?? "Outcome"}
              </strong>
              <strong
                style={{ color: "#ffffff", fontSize: 84, fontWeight: 800 }}
              >
                {probabilityToCents(leadingOutcome?.price)}
              </strong>
            </div>
            <div
              style={{
                background: "rgba(255, 255, 255, 0.18)",
                display: "flex",
                height: 3,
                marginTop: "auto",
                width: "100%",
              }}
            >
              <span
                style={{
                  background: "#5aa9ff",
                  display: "flex",
                  width: `${Math.round(probability * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            background: "rgba(6, 14, 32, 0.55)",
            border: "1px solid rgba(255, 255, 255, 0.22)",
            borderRadius: 12,
            display: "flex",
            gap: 100,
            marginTop: "auto",
            padding: "24px 32px",
            position: "relative",
            width: 640,
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
                  fontSize: 15,
                  letterSpacing: 1.2,
                }}
              >
                {stat.label.toUpperCase()}
              </span>
              <strong style={{ color: "#ffffff", fontSize: 30, marginTop: 8 }}>
                {stat.value}
              </strong>
            </div>
          ))}
        </div>
      </div>
    </div>,
    imageSize,
  );

  response.headers.set(
    "cache-control",
    "public, max-age=300, stale-while-revalidate=3600",
  );
  return response;
}
