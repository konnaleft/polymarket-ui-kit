"use client";

import { useMemo, useState } from "react";
import {
  buildEmbedShotUrl,
  buildIframeSnippet,
  buildReactSnippet,
  buildRegistryCommand,
  buildShareImageUrl,
  copyShareImageToClipboard,
  PolymarketEmbedError,
  resolvePolymarketSlug,
  type CardVisualMode,
  type CopyShareImageStatus,
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
  visual?: CardVisualMode;
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

type ImageCopyState = "idle" | "copying" | CopyShareImageStatus;

function CopyImageBlock({
  disabled,
  imageUrl,
  slug,
}: {
  disabled?: boolean;
  imageUrl: string;
  slug: string | null;
}) {
  const [state, setState] = useState<ImageCopyState>("idle");

  async function handleCopyImage() {
    if (!imageUrl) {
      return;
    }

    setState("copying");
    const status = await copyShareImageToClipboard(imageUrl);
    setState(status);
    window.setTimeout(() => setState("idle"), status === "copied" ? 5000 : 9000);
  }

  const buttonLabel =
    state === "copying" ? "Copying…" : state === "copied" ? "Copied ✓" : "Copy image";
  const fileName = `polymarket-${slug ?? "card"}.png`;

  return (
    <div className="pui-embed-snippet-panel__block">
      <div>
        <span>Card PNG</span>
        <button
          disabled={disabled || state === "copying"}
          onClick={handleCopyImage}
          type="button"
        >
          {buttonLabel}
        </button>
      </div>
      {state === "copied" ? (
        <p className="pui-embed-snippet-panel__hint">
          Copied! Paste (Ctrl+V) into your X post.
        </p>
      ) : null}
      {state === "denied" ? (
        <p className="pui-embed-snippet-panel__hint">
          Clipboard blocked — allow access and retry, or{" "}
          <a download={fileName} href={imageUrl}>
            download the PNG
          </a>
          .
        </p>
      ) : null}
      {state === "unsupported" ? (
        <p className="pui-embed-snippet-panel__hint">
          Image copy is not supported in this browser —{" "}
          <a download={fileName} href={imageUrl}>
            download the PNG
          </a>{" "}
          and attach it manually.
        </p>
      ) : null}
      {state === "failed" ? (
        <p className="pui-embed-snippet-panel__hint">
          Couldn&apos;t fetch the image — retry, or{" "}
          <a download={fileName} href={imageUrl}>
            download the PNG
          </a>
          .
        </p>
      ) : null}
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
  visual = "auto",
}: EmbedSnippetPanelProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [outputTab, setOutputTab] = useState<OutputTab>("embed");
  const resolved = useMemo(() => {
    try {
      const slug = resolvePolymarketSlug(input);
      const visualParam = visual === "auto" ? {} : { visual };
      const common = {
        baseUrl,
        slug,
        surface,
        theme,
        ...(attribution ? { attribution } : {}),
        ...(builderCode ? { builderCode } : {}),
        ...(backgroundImage ? { backgroundImage } : {}),
        ...visualParam,
      };

      return {
        error: null,
        outputs: {
          iframe: buildIframeSnippet(common),
          embedPng: buildEmbedShotUrl({
            baseUrl,
            slug,
            theme,
            ...(attribution ? { attribution } : {}),
            ...(backgroundImage ? { backgroundImage } : {}),
            ...visualParam,
          }),
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
  }, [attribution, backgroundImage, baseUrl, builderCode, input, registryBaseUrl, surface, theme, visual]);

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
          <>
            <SnippetBlock
              copied={copied}
              disabled={!resolved.outputs}
              label="iframe"
              onCopy={copyValue}
              value={resolved.outputs?.iframe ?? ""}
            />
            <CopyImageBlock
              disabled={!resolved.outputs}
              imageUrl={resolved.outputs?.embedPng ?? ""}
              slug={resolved.slug}
            />
          </>
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
            <CopyImageBlock
              disabled={!resolved.outputs}
              imageUrl={resolved.outputs?.ogPng ?? ""}
              slug={resolved.slug}
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
