import sharp from "sharp";
import {
  createShareCardEmbedSvg,
  escapeSvg,
  resolveBackgroundImage,
  type ShareImageTheme,
} from "@polymarket-ui-kit/core";
import { loadPublicMarket } from "../../../components/live-data";

export const runtime = "nodejs";
export const revalidate = 300;

function resolveTheme(value: string | null): ShareImageTheme {
  return value === "light" ? "light" : "dark";
}

/**
 * Site-relative photo paths are resolved against the request origin so the
 * rasterizer can download them. Absolute and data: URLs pass through.
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

/**
 * Rasterizers don't fetch remote images, so the photo is inlined as a data
 * URI before rendering. Falls back to a photo-less card on any failure.
 */
async function inlinePhoto(svg: string, photo: string | null): Promise<string> {
  if (!photo || photo.startsWith("data:image/")) {
    return svg;
  }

  try {
    const response = await fetch(photo);
    if (!response.ok) {
      return svg;
    }

    const mime =
      response.headers.get("content-type")?.split(";")[0]?.trim() ||
      "image/jpeg";
    if (!mime.startsWith("image/")) {
      return svg;
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length) {
      return svg;
    }

    const dataUri = `data:${mime};base64,${bytes.toString("base64")}`;
    return svg.split(escapeSvg(photo)).join(dataUri);
  } catch {
    return svg;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug =
    searchParams.get("slug") ?? "who-will-win-the-2028-us-presidential-election";
  const theme = resolveTheme(searchParams.get("theme"));
  const attribution = searchParams.get("attribution") ?? "polymarket-ui-kit";
  const { market, source } = await loadPublicMarket(slug);
  // Explicit ?backgroundImage= override, else the market's own Gamma image.
  const photo = resolvePhotoUrl(
    resolveBackgroundImage(market, searchParams.get("backgroundImage")),
    request.url,
  );

  const svg = createShareCardEmbedSvg(market, {
    attribution,
    statusLabel: source === "live" ? "Live market" : "Fixture fallback",
    theme,
    ...(photo ? { backgroundImage: photo } : {}),
  });

  const png = await sharp(Buffer.from(await inlinePhoto(svg, photo)))
    .png()
    .toBuffer();

  return new Response(new Uint8Array(png), {
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
