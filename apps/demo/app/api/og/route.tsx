import { ImageResponse } from "next/og";
import {
  clampProbability,
  createShareCardSvg,
  formatCompactNumber,
  probabilityToCents,
  resolveBackgroundImage,
  type ShareImageFormat,
  type ShareImageTheme,
} from "@polymarket-ui-kit/core";
import { loadPublicMarket } from "../../../components/live-data";

export const runtime = "edge";
export const revalidate = 300;

const imageSize = {
  width: 1200,
  height: 630,
};

const themeTokens = {
  dark: {
    page: "#0b0a0c",
    card: "#201f27",
    cardShade: "#17161c",
    cardStroke: "#45424c",
    accent: "#d28457",
    accentSoft: "#34231b",
    ceramic: "#ece9e1",
    ceramicText: "#1c1a19",
    text: "#f0ede7",
    muted: "#aaa5ad",
    surface: "#0f0e12",
    live: "#55cfb3",
  },
  light: {
    page: "#efede7",
    card: "#e5e0d8",
    cardShade: "#d6d0c7",
    cardStroke: "#aca49a",
    accent: "#a75c3a",
    accentSoft: "#ead9cd",
    ceramic: "#faf7f1",
    ceramicText: "#211e1b",
    text: "#211e1b",
    muted: "#6d655e",
    surface: "#f7f3ed",
    live: "#188c77",
  },
};

function resolveTheme(value: string | null): ShareImageTheme {
  return value === "light" ? "light" : "dark";
}

function resolveFormat(value: string | null): ShareImageFormat {
  return value === "svg" ? "svg" : "png";
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
  const theme = resolveTheme(searchParams.get("theme"));
  const format = resolveFormat(searchParams.get("format"));
  const attribution = searchParams.get("attribution") ?? "polymarket-ui-kit";
  const { market, source } = await loadPublicMarket(slug);
  // Explicit ?backgroundImage= override, else the market's own Gamma image.
  // Photo cards always render with the dark treatment for legibility.
  const photo = resolvePhotoUrl(
    resolveBackgroundImage(market, searchParams.get("backgroundImage")),
    request.url,
  );

  if (format === "svg") {
    const svg = createShareCardSvg(market, {
      attribution,
      statusLabel: source === "live" ? "Live market" : "Fixture fallback",
      theme,
      ...(photo ? { backgroundImage: photo } : {}),
    });

    return new Response(svg, {
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "public, max-age=300, stale-while-revalidate=3600",
      },
    });
  }

  const tokens = photo ? themeTokens.dark : themeTokens[theme];
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
        background: tokens.page,
        display: "flex",
        fontFamily: "Arial, sans-serif",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <div
        style={{
          background: `linear-gradient(145deg, ${tokens.card}, ${tokens.cardShade} 58%, ${tokens.card})`,
          border: `1px solid ${tokens.cardStroke}`,
          borderRadius: 18,
          display: "flex",
          flexDirection: "column",
          height: 538,
          overflow: "hidden",
          padding: "32px 36px",
          position: "relative",
          width: 1092,
        }}
      >
        {photo ? (
          <img
            src={photo}
            alt=""
            style={{
              height: 538,
              left: 0,
              objectFit: "cover",
              objectPosition: "right center",
              position: "absolute",
              top: 0,
              width: 1092,
            }}
          />
        ) : null}
        {photo ? (
          <div
            style={{
              background:
                "linear-gradient(90deg, rgba(8, 18, 40, 0.94) 38%, rgba(8, 18, 40, 0.55) 68%, rgba(8, 18, 40, 0.28) 100%)",
              display: "flex",
              height: 538,
              left: 0,
              position: "absolute",
              top: 0,
              width: 1092,
            }}
          />
        ) : null}
        <div
          style={{
            background: tokens.accentSoft,
            display: "flex",
            height: 700,
            position: "absolute",
            right: 180,
            top: -80,
            transform: "rotate(24deg)",
            width: 150,
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
          <div style={{ alignItems: "center", display: "flex", gap: 18 }}>
            <div style={{ display: "flex", height: 38, position: "relative", width: 48 }}>
              <span
                style={{
                  background: tokens.cardShade,
                  border: `1px solid ${tokens.cardStroke}`,
                  borderRadius: 3,
                  display: "flex",
                  height: 30,
                  left: 0,
                  position: "absolute",
                  top: 0,
                  width: 25,
                }}
              />
              <span
                style={{
                  background: tokens.ceramic,
                  border: `1px solid ${tokens.cardStroke}`,
                  borderRadius: 3,
                  bottom: 0,
                  display: "flex",
                  height: 30,
                  position: "absolute",
                  right: 2,
                  width: 25,
                }}
              />
              <span
                style={{
                  background: tokens.accent,
                  display: "flex",
                  height: 3,
                  left: 8,
                  position: "absolute",
                  top: 17,
                  width: 38,
                }}
              />
            </div>
            <strong style={{ color: tokens.text, fontSize: 20, fontWeight: 850 }}>
              POLYMARKET UI KIT
            </strong>
          </div>
          <div style={{ alignItems: "center", display: "flex", gap: 12 }}>
            <span
              style={{
                background: tokens.live,
                borderRadius: 999,
                display: "flex",
                height: 10,
                width: 10,
              }}
            />
            <span
              style={{
                color: tokens.muted,
                fontFamily: "Consolas, monospace",
                fontSize: 14,
                letterSpacing: 1.2,
              }}
            >
              {source === "live" ? "LIVE MARKET" : "FIXTURE FALLBACK"}
            </span>
          </div>
        </div>

        <div
          style={{
            background: tokens.ceramic,
            border: `1px solid ${tokens.cardStroke}`,
            borderRadius: 7,
            display: "flex",
            flexDirection: "column",
            height: 148,
            marginTop: 20,
            padding: "22px 24px",
            position: "relative",
          }}
        >
          <span
            style={{
              color: tokens.accent,
              fontFamily: "Consolas, monospace",
              fontSize: 13,
              letterSpacing: 1.1,
            }}
          >
            MARKET / {(market.category ?? "PREDICTION").toUpperCase()}
          </span>
          <strong
            style={{
              color: tokens.ceramicText,
              fontSize: 40,
              fontWeight: 900,
              letterSpacing: -1.8,
              lineHeight: 1.03,
              marginTop: 12,
              maxWidth: 970,
            }}
          >
            {market.question}
          </strong>
        </div>

        <div style={{ display: "flex", gap: 20, marginTop: 20, position: "relative" }}>
          <div
            style={{
              background: tokens.surface,
              border: `1px solid ${tokens.cardStroke}`,
              borderRadius: 7,
              display: "flex",
              flexDirection: "column",
              height: 194,
              padding: "26px",
              position: "relative",
              width: 640,
            }}
          >
            <span
              style={{
                color: tokens.muted,
                fontFamily: "Consolas, monospace",
                fontSize: 14,
                letterSpacing: 1.2,
              }}
            >
              LEADING OUTCOME
            </span>
            <strong style={{ color: tokens.text, fontSize: 28, marginTop: 22 }}>
              {leadingOutcome?.name ?? "Outcome"}
            </strong>
            <strong
              style={{
                color: tokens.accent,
                fontSize: 74,
                fontWeight: 900,
                letterSpacing: -3,
                position: "absolute",
                right: 30,
                top: 46,
              }}
            >
              {probabilityToCents(leadingOutcome?.price)}
            </strong>
            <div
              style={{
                background: tokens.card,
                bottom: 36,
                display: "flex",
                height: 4,
                left: 26,
                position: "absolute",
                width: 340,
              }}
            >
              <span
                style={{
                  background: tokens.accent,
                  display: "flex",
                  width: `${Math.round(probability * 100)}%`,
                }}
              />
            </div>
          </div>

          <div
            style={{
              background: tokens.cardShade,
              border: `1px solid ${tokens.cardStroke}`,
              borderRadius: 7,
              display: "flex",
              flexDirection: "column",
              gap: 20,
              height: 194,
              padding: "24px",
              width: 360,
            }}
          >
            {visibleStats.map((stat) => (
              <div key={stat.label} style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    color: tokens.muted,
                    fontFamily: "Consolas, monospace",
                    fontSize: 14,
                    letterSpacing: 1.1,
                  }}
                >
                  {stat.label.toUpperCase()}
                </span>
                <strong style={{ color: tokens.text, fontSize: 30, marginTop: 7 }}>
                  {stat.value}
                </strong>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            alignItems: "center",
            color: tokens.muted,
            display: "flex",
            fontFamily: "Consolas, monospace",
            fontSize: 13,
            justifyContent: "space-between",
            letterSpacing: 1,
            marginTop: "auto",
            position: "relative",
          }}
        >
          <span>CIVIC FORECAST / CALIBRATED EDITION</span>
          <span>{attribution}</span>
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
