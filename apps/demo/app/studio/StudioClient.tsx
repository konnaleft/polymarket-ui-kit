"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildEmbedUrl,
  buildShareImageUrl,
  PolymarketEmbedError,
  resolvePolymarketSlug,
  type EmbedSurface,
  type ShareImageTheme,
} from "@polymarket-ui-kit/core";
import { EmbedSnippetPanel } from "@polymarket-ui-kit/react";
import { sampleBuilder } from "../../components/sample-builder";
import { RouteThemeSync } from "../components/RouteThemeSync";

type OutputMode = "embed" | "og-png" | "og-svg";

const defaultInput =
  "https://polymarket.com/event/who-will-win-the-2028-us-presidential-election";

const surfaces: Array<{ label: string; value: EmbedSurface }> = [
  { label: "Share card", value: "share-card" },
  { label: "Market card", value: "market-card" },
  { label: "Builder disclosure", value: "builder-disclosure" },
];

const outputModes: Array<{ label: string; value: OutputMode }> = [
  { label: "Embed", value: "embed" },
  { label: "OG PNG", value: "og-png" },
  { label: "OG SVG", value: "og-svg" },
];

export function StudioClient() {
  const [attribution, setAttribution] = useState("pui-kit/demo");
  const [backgroundImage, setBackgroundImage] = useState("");
  const [builderCode, setBuilderCode] = useState(sampleBuilder.code ?? "");
  const [input, setInput] = useState(defaultInput);
  const [origin, setOrigin] = useState("");
  const [outputMode, setOutputMode] = useState<OutputMode>("embed");
  const [surface, setSurface] = useState<EmbedSurface>("share-card");
  const [theme, setTheme] = useState<ShareImageTheme>("dark");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const resolved = useMemo(() => {
    try {
      const slug = resolvePolymarketSlug(input);
      const photoOverride = backgroundImage.trim() ? backgroundImage.trim() : undefined;
      const common = {
        baseUrl: origin,
        slug,
        surface,
        theme,
        ...(attribution ? { attribution } : {}),
        ...(builderCode ? { builderCode } : {}),
        ...(photoOverride ? { backgroundImage: photoOverride } : {}),
      };

      return {
        embedUrl: buildEmbedUrl(common),
        error: null,
        ogPngUrl: buildShareImageUrl({
          baseUrl: origin,
          format: "png",
          slug,
          theme,
          ...(attribution ? { attribution } : {}),
          ...(photoOverride ? { backgroundImage: photoOverride } : {}),
        }),
        ogSvgUrl: buildShareImageUrl({
          baseUrl: origin,
          format: "svg",
          slug,
          theme,
          ...(attribution ? { attribution } : {}),
          ...(photoOverride ? { backgroundImage: photoOverride } : {}),
        }),
        slug,
      };
    } catch (error) {
      return {
        embedUrl: "",
        error:
          error instanceof PolymarketEmbedError
            ? error.message
            : "Paste a valid Polymarket URL or slug.",
        ogPngUrl: "",
        ogSvgUrl: "",
        slug: null,
      };
    }
  }, [attribution, backgroundImage, builderCode, input, origin, surface, theme]);

  const previewUrl =
    outputMode === "og-png"
      ? resolved.ogPngUrl
      : outputMode === "og-svg"
        ? resolved.ogSvgUrl
        : resolved.embedUrl;

  return (
    <>
      <RouteThemeSync theme={theme} />
      <section className="demo-studio" aria-labelledby="studio-title">
        <header className="demo-studio__hero">
          <div>
            <p className="demo-kicker">
              <a href="/">Polymarket UI Kit</a> / Calibration Studio
            </p>
            <h1 id="studio-title">Calibrate once. Publish everywhere.</h1>
            <p>
              Turn one market URL into a live embed, React surface, share plate, and
              registry command from a single controlled workspace.
            </p>
          </div>
          <div className="demo-studio__stamp" aria-hidden="true">
            CAL / 01
          </div>
        </header>

        <div className="demo-studio__controls" aria-label="Embed controls">
          <label>
            MARKET URL OR SLUG
            <input onChange={(event) => setInput(event.target.value)} value={input} />
          </label>
          <label>
            SURFACE
            <select
              onChange={(event) => setSurface(event.target.value as EmbedSurface)}
              value={surface}
            >
              {surfaces.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            ATTRIBUTION
            <input
              onChange={(event) => setAttribution(event.target.value)}
              value={attribution}
            />
          </label>
          <label>
            BACKGROUND IMAGE URL (EMPTY = MARKET PHOTO)
            <input
              onChange={(event) => setBackgroundImage(event.target.value)}
              placeholder="https://… or /photo.jpg"
              type="url"
              value={backgroundImage}
            />
          </label>
          <label>
            PUBLIC BUILDER CODE
            <input
              onChange={(event) => setBuilderCode(event.target.value)}
              value={builderCode}
            />
          </label>
        </div>

        <div className="demo-studio__switchboard">
          <div className="demo-studio__theme" role="group" aria-label="Theme">
            {(["light", "dark"] as ShareImageTheme[]).map((item) => (
              <button
                data-active={theme === item ? "true" : undefined}
                key={item}
                onClick={() => setTheme(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
          <div className="demo-studio__theme" role="group" aria-label="Output type">
            {outputModes.map((item) => (
              <button
                data-active={outputMode === item.value ? "true" : undefined}
                key={item.value}
                onClick={() => setOutputMode(item.value)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="demo-studio__workspace">
          <div className="demo-studio__preview">
            <div className="demo-module__label">
              <span aria-hidden="true">●</span>
              <strong>Live preview</strong>
            </div>
            {resolved.error ? (
              <div className="demo-studio__error" role="alert">
                {resolved.error}
              </div>
            ) : outputMode === "embed" ? (
              <iframe
                key={previewUrl}
                src={previewUrl}
                title={`Polymarket embed for ${resolved.slug}`}
              />
            ) : (
              <img alt={`Share export for ${resolved.slug}`} src={previewUrl} />
            )}
          </div>

          <EmbedSnippetPanel
            attribution={attribution}
            baseUrl={origin}
            className="demo-studio__outputs"
            input={input}
            surface={surface}
            theme={theme}
            {...(builderCode ? { builderCode } : {})}
            {...(backgroundImage.trim() ? { backgroundImage: backgroundImage.trim() } : {})}
            {...(origin ? { registryBaseUrl: `${origin}/r` } : {})}
          />
        </div>
      </section>
    </>
  );
}
