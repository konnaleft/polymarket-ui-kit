import { useMemo } from "react";
import type { ShareImageFormat, ShareImageTheme } from "@polymarket-ui-kit/core";

export interface UseShareImageOptions {
  slug: string;
  baseUrl?: string;
  theme?: ShareImageTheme;
  format?: ShareImageFormat;
  attribution?: string;
  /** Photo override for the OG export. Empty = market.image default. */
  backgroundImage?: string;
}

export function useShareImage({
  slug,
  baseUrl = "",
  theme = "dark",
  format = "png",
  attribution,
  backgroundImage,
}: UseShareImageOptions) {
  return useMemo(() => {
    const params = new URLSearchParams({ slug, theme, format });

    if (attribution) {
      params.set("attribution", attribution);
    }

    if (backgroundImage) {
      params.set("backgroundImage", backgroundImage);
    }

    const path = `/api/og?${params.toString()}`;
    const url = baseUrl ? new URL(path, baseUrl).toString() : path;

    return {
      url,
      alt: `Share image for ${slug}`,
      downloadName: `${slug}.${format}`,
    };
  }, [attribution, backgroundImage, baseUrl, format, slug, theme]);
}
