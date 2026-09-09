"use client";

import { useMemo, useState } from "react";
import {
  buildIframeSnippet,
  buildReactSnippet,
  buildRegistryCommand,
  buildShareImageUrl,
  PolymarketEmbedError,
  resolvePolymarketSlug,
  type EmbedSurface,
  type ShareImageTheme,
} from "@polymarket-ui-kit/core";

export interface EmbedSnippetPanelProps {
  input: string;
  attribution?: string;
  backgroundImage?: string;
  baseUrl?: string;
  builderCode?: string;
  className?: string;
  registryBaseUrl?: string;
  surface?: EmbedSurface;
  theme?: ShareImageTheme;
}

interface SnippetBlockProps {
  copied: string | null;
  disabled?: boolean;
  label: string;
  onCopy: (label: string, value: string) => void;
  value: string;
}

type OutputTab = "embed" | "react" | "og" | "registry";

const outputTabs: Array<{ label: string; value: OutputTab }> = [
  { label: "Embed", value: "embed" },
  { label: "React", value: "react" },
  { label: "OG", value: "og" },
  { label: "Registry", value: "registry" },
];

function SnippetBlock({ copied, disabled, label, onCopy, value }: SnippetBlockProps) {
  return (
    <div className="pui-embed-snippet-panel__block">
      <div>
        <span>{label}</span>
        <button disabled={disabled} onClick={() => onCopy(label, value)} type="button">
          {copied === label ? "Copied" : "Copy"}
        </button>
      </div>
      <code>{value}</code>
    </div>
  );
}

export function EmbedSnippetPanel({
  attribution,
  backgroundImage,
  baseUrl = "",
  builderCode,
  className,
  input,
  registryBaseUrl,
  surface = "share-card",
  theme = "dark",
}: EmbedSnippetPanelProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [outputTab, setOutputTab] = useState<OutputTab>("embed");
  const resolved = useMemo(() => {
    try {
      const slug = resolvePolymarketSlug(input);
      const common = {
        baseUrl,
        slug,
        surface,
        theme,
        ...(attribution ? { attribution } : {}),
        ...(builderCode ? { builderCode } : {}),
        ...(backgroundImage ? { backgroundImage } : {}),
      };

      return {
        error: null,
        outputs: {
          iframe: buildIframeSnippet(common),
          ogPng: buildShareImageUrl({
            baseUrl,
            format: "png",
            slug,
            theme,
            ...(attribution ? { attribution } : {}),
            ...(backgroundImage ? { backgroundImage } : {}),
          }),
          ogSvg: buildShareImageUrl({
            baseUrl,
            format: "svg",
            slug,
            theme,
            ...(attribution ? { attribution } : {}),
            ...(backgroundImage ? { backgroundImage } : {}),
          }),
          react: buildReactSnippet({
            slug,
            surface,
            ...(builderCode ? { builderCode } : {}),
          }),
          registry: buildRegistryCommand({
            item: "embed-studio",
            ...(registryBaseUrl ? { registryBaseUrl } : {}),
          }),
        },
        slug,
      };
    } catch (error) {
      return {
        error:
          error instanceof PolymarketEmbedError
            ? error.message
            : "Paste a valid Polymarket URL or market slug.",
        outputs: null,
        slug: null,
      };
    }
  }, [attribution, backgroundImage, baseUrl, builderCode, input, registryBaseUrl, surface, theme]);

  async function copyValue(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard writes can be blocked in embedded or local preview contexts.
    }

    setCopied(label);
    window.setTimeout(() => setCopied(null), 1400);
  }

  const classes = ["pui-embed-snippet-panel", className].filter(Boolean).join(" ");

  return (
    <section className={classes} data-pui-theme={theme}>
      <header className="pui-embed-snippet-panel__header">
        <div>
          <span>Distribution outputs</span>
          <h3>{outputTabs.find((item) => item.value === outputTab)?.label} output</h3>
        </div>
        <strong>{resolved.slug ?? "Invalid input"}</strong>
      </header>

      <div
        className="pui-embed-snippet-panel__tabs"
        role="tablist"
        aria-label="Output format"
      >
        {outputTabs.map((item) => (
          <button
            aria-selected={outputTab === item.value}
            data-active={outputTab === item.value ? "true" : undefined}
            key={item.value}
            onClick={() => setOutputTab(item.value)}
            role="tab"
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      {resolved.error ? (
        <div className="pui-embed-snippet-panel__error" role="alert">
          {resolved.error}
        </div>
      ) : null}

      <div className="pui-embed-snippet-panel__grid" role="tabpanel">
        {outputTab === "embed" ? (
          <SnippetBlock
            copied={copied}
            disabled={!resolved.outputs}
            label="iframe"
            onCopy={copyValue}
            value={resolved.outputs?.iframe ?? ""}
          />
        ) : null}
        {outputTab === "react" ? (
          <SnippetBlock
            copied={copied}
            disabled={!resolved.outputs}
            label="React"
            onCopy={copyValue}
            value={resolved.outputs?.react ?? ""}
          />
        ) : null}
        {outputTab === "og" ? (
          <>
            <SnippetBlock
              copied={copied}
              disabled={!resolved.outputs}
              label="OG PNG"
              onCopy={copyValue}
              value={resolved.outputs?.ogPng ?? ""}
            />
            <SnippetBlock
              copied={copied}
              disabled={!resolved.outputs}
              label="OG SVG"
              onCopy={copyValue}
              value={resolved.outputs?.ogSvg ?? ""}
            />
          </>
        ) : null}
        {outputTab === "registry" ? (
          <SnippetBlock
            copied={copied}
            disabled={!resolved.outputs}
            label="Registry"
            onCopy={copyValue}
            value={resolved.outputs?.registry ?? ""}
          />
        ) : null}
      </div>
    </section>
  );
}
